#!/usr/bin/env python3
"""
Migrate ekap-intelligence SQLite DB -> Neon PostgreSQL (v2 - fixed)
"""

import sqlite3
import psycopg2
import psycopg2.extras
import os
import sys
import time
import json
import hashlib
import re
from datetime import datetime
from pathlib import Path

# ─── Config ─────────────────────────────────────────────────

SQLITE_PATH = r"C:\Users\stpin\OneDrive\Desktop\yazilim_gelistirme\ekap-intelligence\ekap.db"

env_path = Path(__file__).parent.parent / ".env.local"
DB_URL = None
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL=") and "UNPOOLED" not in line:
            DB_URL = line.split("=", 1)[1].strip().strip('"')
            break

if not DB_URL:
    print("ERROR: DATABASE_URL not found in .env.local")
    sys.exit(1)

if "channel_binding" in DB_URL:
    DB_URL = re.sub(r'[?&]channel_binding=[^&]*', '', DB_URL)
    if '?' not in DB_URL and 'sslmode' in DB_URL:
        DB_URL = DB_URL.replace('&sslmode', '?sslmode')

BATCH_SIZE = 2000

def cuid():
    ts = hex(int(time.time() * 1000))[2:]
    rnd = hashlib.md5(os.urandom(16)).hexdigest()[:8]
    return f"c{ts}{rnd}"

TENDER_TYPE_MAP = {
    "Yapim": "YAPIM", "Yapim Isleri": "YAPIM",
    "Mal Alimi": "MAL_ALIMI", "Mal": "MAL_ALIMI",
    "Hizmet Alimi": "HIZMET", "Hizmet": "HIZMET",
    "Danismanlik Hizmet Alimi": "DANISMANLIK", "Danismanlik": "DANISMANLIK",
}

STATUS_MAP = {
    "Sonuclandi": "SONUCLANDI", "Iptal": "IPTAL",
    "Degerlendirme": "DEGERLENDIRME", "Basvuru Acik": "BASVURU_ACIK",
    "Yaklasan": "YAKLASAN",
}

def normalize_tr(s):
    if not s: return s
    table = str.maketrans("csgiopuCSSGIOPU", "csgiopuCSSGIOPU")
    return s.translate(table)

def map_tender_type(raw):
    if not raw: return "YAPIM"
    n = normalize_tr(raw)
    for k, v in TENDER_TYPE_MAP.items():
        if k.lower() in n.lower():
            return v
    if "yap" in raw.lower(): return "YAPIM"
    if "mal" in raw.lower(): return "MAL_ALIMI"
    if "hizmet" in raw.lower(): return "HIZMET"
    if "dan" in raw.lower(): return "DANISMANLIK"
    return "YAPIM"

def map_status(raw):
    if not raw: return "SONUCLANDI"
    for k, v in STATUS_MAP.items():
        if k.lower() in raw.lower():
            return v
    if "iptal" in raw.lower(): return "IPTAL"
    if "sonuc" in raw.lower(): return "SONUCLANDI"
    return "SONUCLANDI"

def safe_date(val, fallback="2020-01-01 00:00:00"):
    if not val: return fallback
    try:
        for fmt in ["%Y-%m-%d", "%d.%m.%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
            try:
                return datetime.strptime(str(val)[:19], fmt).strftime("%Y-%m-%d %H:%M:%S")
            except ValueError:
                continue
        return fallback
    except Exception:
        return fallback

def safe_decimal(val):
    if val is None: return None
    try: return float(val)
    except: return None

def okas_to_json(raw):
    """Convert '15000000 - Gida' to JSON array"""
    if not raw: return None
    try:
        json.loads(raw)
        return raw  # Already valid JSON
    except:
        pass
    # Parse "CODE - Name, CODE - Name" format
    codes = []
    for part in raw.split(","):
        part = part.strip()
        if not part: continue
        codes.append(part)
    if codes:
        return json.dumps(codes, ensure_ascii=False)
    return None


# ─── Migration Functions ────────────────────────────────────

def migrate_tenders(sqlite_cur, pg_conn):
    print("\n[1/6] Migrating tenders...")

    sqlite_cur.execute("SELECT COUNT(*) FROM tenders")
    total = sqlite_cur.fetchone()[0]
    print(f"  Source: {total:,}")

    pg_cur = pg_conn.cursor()
    pg_cur.execute('SELECT "ekapNo" FROM "Tender" WHERE "ekapNo" IS NOT NULL')
    existing_ikns = set(r[0] for r in pg_cur.fetchall())
    print(f"  Already in Neon: {len(existing_ikns):,}")

    inserted = 0
    skipped = 0
    errors = 0
    err_printed = 0

    sqlite_cur.execute("""
        SELECT ikn, title, authority, province, tender_type, status,
               approx_cost, publish_date, deadline, sector_tag,
               okas_codes, e_ihale, kismi_ihale
        FROM tenders
        WHERE publish_date >= '2024-03-27'
        ORDER BY publish_date DESC
    """)

    batch = []
    for row in sqlite_cur:
        ikn = row[0]
        if not ikn or ikn in existing_ikns:
            skipped += 1
            continue

        title = (row[1] or "Basliksiz Ihale")[:500]
        institution = (row[2] or "Bilinmiyor")[:300]
        city = (row[3] or "Bilinmiyor")[:100]
        tender_type = map_tender_type(row[4])
        status = map_status(row[5])
        estimated_cost = safe_decimal(row[6])
        publish_date = safe_date(row[7])
        deadline = safe_date(row[8], "2025-12-31 00:00:00")
        oks_json = okas_to_json(row[10])
        e_ihale = bool(row[11]) if row[11] is not None else False
        partial_bid = bool(row[12]) if row[12] is not None else False
        now = datetime.now().isoformat()

        batch.append((
            cuid(), title, institution, city, tender_type, status,
            ikn, estimated_cost, publish_date, deadline,
            oks_json, e_ihale, partial_bid, "EKAP", now, now
        ))

        if len(batch) >= BATCH_SIZE:
            try:
                psycopg2.extras.execute_values(pg_cur, """
                    INSERT INTO "Tender" (id, title, institution, city, "tenderType", status,
                        "ekapNo", "estimatedCost", "publishDate", deadline,
                        "oksCodes", "eIhale", "partialBid", source,
                        "createdAt", "updatedAt")
                    VALUES %s
                    ON CONFLICT ("ekapNo") DO NOTHING
                """, batch, template="""(
                    %s, %s, %s, %s, %s::"TenderType", %s::"TenderStatus",
                    %s, %s, %s::timestamp, %s::timestamp,
                    %s::jsonb, %s, %s, %s,
                    %s::timestamp, %s::timestamp
                )""")
                pg_conn.commit()
                inserted += len(batch)
            except Exception as e:
                pg_conn.rollback()
                errors += len(batch)
                if err_printed < 3:
                    print(f"  ERR: {str(e)[:200]}")
                    err_printed += 1
            batch = []
            if (inserted + errors) % 50000 == 0 and inserted > 0:
                print(f"  ... {inserted:,} inserted, {errors:,} errors")

    if batch:
        try:
            psycopg2.extras.execute_values(pg_cur, """
                INSERT INTO "Tender" (id, title, institution, city, "tenderType", status,
                    "ekapNo", "estimatedCost", "publishDate", deadline,
                    "oksCodes", "eIhale", "partialBid", source,
                    "createdAt", "updatedAt")
                VALUES %s
                ON CONFLICT ("ekapNo") DO NOTHING
            """, batch, template="""(
                %s, %s, %s, %s, %s::"TenderType", %s::"TenderStatus",
                %s, %s, %s::timestamp, %s::timestamp,
                %s::jsonb, %s, %s, %s,
                %s::timestamp, %s::timestamp
            )""")
            pg_conn.commit()
            inserted += len(batch)
        except Exception as e:
            pg_conn.rollback()
            errors += len(batch)

    pg_cur.close()
    print(f"  DONE: {inserted:,} inserted, {skipped:,} skipped, {errors:,} errors")
    return inserted


def migrate_tender_results(sqlite_cur, pg_conn):
    print("\n[2/6] Migrating tender results...")

    pg_cur = pg_conn.cursor()
    pg_cur.execute('SELECT "ekapNo", id FROM "Tender" WHERE "ekapNo" IS NOT NULL')
    tender_map = dict(pg_cur.fetchall())
    print(f"  Tender map: {len(tender_map):,}")

    # Get existing results to avoid dups
    pg_cur.execute('SELECT "tenderId" FROM "TenderResult"')
    existing_tids = set(r[0] for r in pg_cur.fetchall())

    sqlite_cur.execute("""
        SELECT ikn, firm_name, bid_amount, contract_date
        FROM tender_bids WHERE is_winner = 1 AND firm_name IS NOT NULL
    """)

    inserted = 0
    batch = []
    for row in sqlite_cur:
        ikn, firm_name, bid_amount, contract_date = row
        tid = tender_map.get(ikn)
        if not tid or tid in existing_tids:
            continue
        existing_tids.add(tid)

        batch.append((cuid(), tid, firm_name[:300], safe_decimal(bid_amount) or 0,
                      safe_date(contract_date), datetime.now().isoformat()))

        if len(batch) >= BATCH_SIZE:
            try:
                psycopg2.extras.execute_values(pg_cur, """
                    INSERT INTO "TenderResult" (id, "tenderId", "winnerName", "winnerAmount", "resultDate", "createdAt")
                    VALUES %s ON CONFLICT DO NOTHING
                """, batch, template="(%s, %s, %s, %s, %s::timestamp, %s::timestamp)")
                pg_conn.commit()
                inserted += len(batch)
            except Exception as e:
                pg_conn.rollback()
            batch = []

    if batch:
        try:
            psycopg2.extras.execute_values(pg_cur, """
                INSERT INTO "TenderResult" (id, "tenderId", "winnerName", "winnerAmount", "resultDate", "createdAt")
                VALUES %s ON CONFLICT DO NOTHING
            """, batch, template="(%s, %s, %s, %s, %s::timestamp, %s::timestamp)")
            pg_conn.commit()
            inserted += len(batch)
        except: pg_conn.rollback()

    pg_cur.close()
    print(f"  DONE: {inserted:,}")
    return inserted


def migrate_price_index(sqlite_cur, pg_conn):
    print("\n[3/6] Migrating price index...")

    pg_cur = pg_conn.cursor()
    # Clear old migration data
    pg_cur.execute("""DELETE FROM "PriceIndex" WHERE source = 'EKAP SQLite'""")
    pg_conn.commit()

    sqlite_cur.execute("""
        SELECT okas_code, province, year, quarter, avg_discount, tender_count, avg_contract_amt
        FROM price_index
    """)

    inserted = 0
    batch = []
    for row in sqlite_cur:
        okas_code, province, year, quarter, avg_discount, tender_count, avg_contract_amt = row
        if not okas_code or not province: continue

        month = f"{year}-{quarter * 3:02d}" if quarter else f"{year}-01"
        batch.append((cuid(), f"OKAS-{okas_code}", province, "adet",
                      safe_decimal(avg_contract_amt) or 0, safe_decimal(avg_discount),
                      month, "EKAP SQLite", datetime.now().isoformat()))

        if len(batch) >= BATCH_SIZE:
            try:
                psycopg2.extras.execute_values(pg_cur, """
                    INSERT INTO "PriceIndex" (id, sector, item, unit, price, change, month, source, "createdAt")
                    VALUES %s ON CONFLICT (sector, item, month) DO NOTHING
                """, batch, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
                pg_conn.commit()
                inserted += len(batch)
            except Exception as e:
                pg_conn.rollback()
                print(f"  ERR: {e}")
            batch = []

    if batch:
        try:
            psycopg2.extras.execute_values(pg_cur, """
                INSERT INTO "PriceIndex" (id, sector, item, unit, price, change, month, source, "createdAt")
                VALUES %s ON CONFLICT (sector, item, month) DO NOTHING
            """, batch, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
            pg_conn.commit()
            inserted += len(batch)
        except: pg_conn.rollback()

    pg_cur.close()
    print(f"  DONE: {inserted:,}")
    return inserted


def migrate_competition_density(sqlite_cur, pg_conn):
    print("\n[4/6] Generating competition density...")

    pg_cur = pg_conn.cursor()
    pg_cur.execute("""DELETE FROM "CompetitionDensity" WHERE period LIKE '%Q%'""")
    pg_conn.commit()

    sqlite_cur.execute("""
        SELECT province, tender_type,
               AVG(bid_count), COUNT(*), SUM(approx_cost),
               substr(publish_date, 1, 4) || '-Q' || ((cast(substr(publish_date, 6, 2) as int) - 1) / 3 + 1)
        FROM tenders
        WHERE province IS NOT NULL AND bid_count > 0 AND publish_date IS NOT NULL
        GROUP BY province, tender_type,
                 substr(publish_date, 1, 4) || '-Q' || ((cast(substr(publish_date, 6, 2) as int) - 1) / 3 + 1)
        HAVING COUNT(*) >= 3
    """)

    inserted = 0
    batch = []
    for row in sqlite_cur:
        province, ttype, avg_bid, cnt, total_budget, period = row
        if not province or not period: continue
        sector = map_tender_type(ttype) if ttype else "YAPIM"
        wr = (1.0 / avg_bid * 100) if avg_bid and avg_bid > 0 else 0

        batch.append((cuid(), province[:100], sector, avg_bid or 0, wr,
                      cnt or 0, safe_decimal(total_budget) or 0, period,
                      datetime.now().isoformat()))

        if len(batch) >= BATCH_SIZE:
            try:
                psycopg2.extras.execute_values(pg_cur, """
                    INSERT INTO "CompetitionDensity" (id, city, sector, "avgBidders", "winRate",
                        "totalTenders", "totalBudget", period, "updatedAt")
                    VALUES %s ON CONFLICT (city, sector, period) DO NOTHING
                """, batch, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
                pg_conn.commit()
                inserted += len(batch)
            except Exception as e:
                pg_conn.rollback()
            batch = []

    if batch:
        try:
            psycopg2.extras.execute_values(pg_cur, """
                INSERT INTO "CompetitionDensity" (id, city, sector, "avgBidders", "winRate",
                    "totalTenders", "totalBudget", period, "updatedAt")
                VALUES %s ON CONFLICT (city, sector, period) DO NOTHING
            """, batch, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
            pg_conn.commit()
            inserted += len(batch)
        except: pg_conn.rollback()

    pg_cur.close()
    print(f"  DONE: {inserted:,}")
    return inserted


def migrate_daily_stats(sqlite_cur, pg_conn):
    print("\n[5/6] Generating daily stats...")

    pg_cur = pg_conn.cursor()

    sqlite_cur.execute("""
        SELECT publish_date, COUNT(*), SUM(approx_cost), AVG(approx_cost)
        FROM tenders WHERE publish_date IS NOT NULL
        GROUP BY publish_date ORDER BY publish_date DESC LIMIT 3650
    """)

    inserted = 0
    batch = []
    for row in sqlite_cur:
        pub_date, cnt, total, avg_val = row
        if not pub_date: continue
        d = safe_date(pub_date)

        batch.append((cuid(), d, cnt or 0, 0, 0,
                      safe_decimal(total) or 0, safe_decimal(avg_val) or 0,
                      0, 0, 0, 0, datetime.now().isoformat()))

        if len(batch) >= BATCH_SIZE:
            try:
                psycopg2.extras.execute_values(pg_cur, """
                    INSERT INTO "DailyStats" (id, date, "totalTenders", "newTenders", "closingTenders",
                        "totalBudget", "avgBudget", "totalUsers", "activeUsers",
                        "totalSearches", "totalPageViews", "createdAt")
                    VALUES %s ON CONFLICT (date) DO NOTHING
                """, batch, template="(%s, %s::date, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
                pg_conn.commit()
                inserted += len(batch)
            except Exception as e:
                pg_conn.rollback()
                print(f"  ERR: {str(e)[:150]}")
            batch = []

    if batch:
        try:
            psycopg2.extras.execute_values(pg_cur, """
                INSERT INTO "DailyStats" (id, date, "totalTenders", "newTenders", "closingTenders",
                    "totalBudget", "avgBudget", "totalUsers", "activeUsers",
                    "totalSearches", "totalPageViews", "createdAt")
                VALUES %s ON CONFLICT (date) DO NOTHING
            """, batch, template="(%s, %s::date, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
            pg_conn.commit()
            inserted += len(batch)
        except: pg_conn.rollback()

    pg_cur.close()
    print(f"  DONE: {inserted:,}")
    return inserted


def migrate_sector_stats(sqlite_cur, pg_conn):
    print("\n[6/6] Generating sector stats...")

    pg_cur = pg_conn.cursor()

    sqlite_cur.execute("""
        SELECT tender_type,
               substr(publish_date, 1, 7) as month,
               COUNT(*) as cnt,
               SUM(approx_cost) as total,
               AVG(approx_cost) as avg_cost,
               AVG(bid_count) as avg_bids
        FROM tenders
        WHERE publish_date IS NOT NULL AND tender_type IS NOT NULL
        GROUP BY tender_type, substr(publish_date, 1, 7)
        ORDER BY month DESC
    """)

    inserted = 0
    batch = []
    for row in sqlite_cur:
        ttype, month, cnt, total, avg_cost, avg_bids = row
        if not ttype or not month: continue
        sector = map_tender_type(ttype)

        batch.append((cuid(), month, sector, cnt or 0,
                      safe_decimal(total) or 0, safe_decimal(avg_cost) or 0,
                      int(avg_bids or 0), datetime.now().isoformat()))

        if len(batch) >= BATCH_SIZE:
            try:
                psycopg2.extras.execute_values(pg_cur, """
                    INSERT INTO "SectorStats" (id, month, sector, "tenderCount",
                        "totalBudget", "avgBudget", "avgBidders", "createdAt")
                    VALUES %s ON CONFLICT DO NOTHING
                """, batch, template="(%s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
                pg_conn.commit()
                inserted += len(batch)
            except Exception as e:
                pg_conn.rollback()
                print(f"  ERR: {str(e)[:150]}")
            batch = []

    if batch:
        try:
            psycopg2.extras.execute_values(pg_cur, """
                INSERT INTO "SectorStats" (id, month, sector, "tenderCount",
                    "totalBudget", "avgBudget", "avgBidders", "createdAt")
                VALUES %s ON CONFLICT DO NOTHING
            """, batch, template="(%s, %s, %s, %s, %s, %s, %s, %s::timestamp)")
            pg_conn.commit()
            inserted += len(batch)
        except: pg_conn.rollback()

    pg_cur.close()
    print(f"  DONE: {inserted:,}")
    return inserted


# ─── Main ───────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("EKAP SQLite -> Neon PostgreSQL Migration v2")
    print(f"Source: {SQLITE_PATH}")
    print(f"Target: {DB_URL[:60]}...")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)
    sys.stdout.flush()

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_cur = sqlite_conn.cursor()
    pg_conn = psycopg2.connect(DB_URL)
    pg_conn.autocommit = False

    results = {}
    try:
        results["tenders"] = migrate_tenders(sqlite_cur, pg_conn)
        sys.stdout.flush()
        results["results"] = migrate_tender_results(sqlite_cur, pg_conn)
        sys.stdout.flush()
        results["price_index"] = migrate_price_index(sqlite_cur, pg_conn)
        results["competition"] = migrate_competition_density(sqlite_cur, pg_conn)
        results["daily_stats"] = migrate_daily_stats(sqlite_cur, pg_conn)
        results["sector_stats"] = migrate_sector_stats(sqlite_cur, pg_conn)
    except KeyboardInterrupt:
        print("\nInterrupted!")
    except Exception as e:
        print(f"\nFATAL: {e}")
        import traceback; traceback.print_exc()
    finally:
        sqlite_conn.close()
        pg_conn.close()

    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    total = 0
    for key, count in results.items():
        print(f"  {key}: {count:,}")
        total += count
    print(f"\nTotal: {total:,}")
    print(f"Finished: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()
