"""
AkShare Microservice - Fallback data source for dashboard
Provides real-time market data as fallback when Tushare APIs fail or hit rate limits.

Data Priority: Tushare (primary) -> AkShare (fallback) -> Eastmoney (real-time pool)

Endpoints:
  GET /health          - Health check
  GET /limit_up        - 涨停板数据 (stock_zt_pool_em)
  GET /limit_down      - 跌停板数据 (stock_zt_pool_dtgc_em)
  GET /broken_board    - 炸板数据 (stock_zt_pool_zbgc_em)
  GET /board_ladder    - 连板天梯 (from stock_zt_pool_em 连板数)
  GET /market_stats    - 综合统计 (最高板/炸板率/封板比)
  GET /concept_heat    - 概念板块热力 (stock_board_concept_name_em)
  GET /industry_heat   - 行业板块热力 (stock_board_industry_name_em)
  GET /market_overview - 市场涨跌家数 (stock_zh_a_spot_em)
  GET /last_trade_date - 最后交易日
  GET /stock_quote     - 个股实时行情 (stock_zh_a_spot_em)
  GET /stock_individual - 个股行情 (stock_zh_a_hist / stock_individual_info_em)
"""

import json
import time
import traceback
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import sys
import os

# Add akshare import with error handling
try:
    import akshare as ak
    import pandas as pd
    AKSHARE_AVAILABLE = True
except ImportError:
    AKSHARE_AVAILABLE = False
    print("[AkShare Service] WARNING: akshare not installed. pip install akshare")

# Cache to avoid excessive API calls
_cache = {}
CACHE_TTL = 300  # 5 minutes


def get_trade_date(date_str=None):
    """Get trade date in YYYYMMDD format"""
    if date_str and len(date_str) == 8:
        return date_str
    if date_str and len(date_str) == 10:
        return date_str.replace('-', '')
    # Use latest weekday
    now = datetime.now()
    for i in range(10):
        d = now - timedelta(days=i)
        if d.weekday() < 5:  # Mon-Fri
            return d.strftime('%Y%m%d')
    return now.strftime('%Y%m%d')


def cache_get(key):
    """Get from cache if not expired"""
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def cache_set(key, data):
    """Set cache"""
    _cache[key] = (data, time.time())


def fetch_limit_up(date_str):
    """涨停板数据 - AkShare stock_zt_pool_em"""
    cache_key = f"limit_up_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        df = ak.stock_zt_pool_em(date=date_str)
        if df is None or len(df) == 0:
            return []
        
        stocks = []
        for _, row in df.iterrows():
            stocks.append({
                "code": str(row.get('代码', '')),
                "name": str(row.get('名称', '')),
                "pct_chg": float(row.get('涨跌幅', 0)),
                "close": float(row.get('最新价', 0)),
                "amount": float(row.get('成交额', 0)),
                "turnover_ratio": float(row.get('换手率', 0)),
                "limit_times": int(row.get('连板数', 1)),
                "first_time": str(row.get('首次封板时间', '')),
                "last_time": str(row.get('最后封板时间', '')),
                "open_times": int(row.get('炸板次数', 0)),
                "industry": str(row.get('所属行业', '')),
                "tag": str(row.get('所属行业', '')),
                "status": f"{int(row.get('连板数', 1))}连板" if int(row.get('连板数', 1)) > 1 else "",
            })
        
        cache_set(cache_key, stocks)
        return stocks
    except Exception as e:
        print(f"[AkShare] fetch_limit_up error: {e}")
        return []


def fetch_limit_down(date_str):
    """跌停板数据 - AkShare stock_zt_pool_dtgc_em"""
    cache_key = f"limit_down_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        df = ak.stock_zt_pool_dtgc_em(date=date_str)
        if df is None or len(df) == 0:
            return []
        
        stocks = []
        for _, row in df.iterrows():
            stocks.append({
                "code": str(row.get('代码', '')),
                "name": str(row.get('名称', '')),
                "pct_chg": float(row.get('涨跌幅', 0)),
                "close": float(row.get('最新价', 0)),
                "amount": float(row.get('成交额', 0)),
                "turnover_ratio": float(row.get('换手率', 0)),
                "limit_times": int(row.get('连续跌停', 1)),
                "last_time": str(row.get('最后封板时间', '')),
                "open_times": int(row.get('开板次数', 0)),
                "industry": str(row.get('所属行业', '')),
                "tag": str(row.get('所属行业', '')),
                "status": "",
            })
        
        cache_set(cache_key, stocks)
        return stocks
    except Exception as e:
        print(f"[AkShare] fetch_limit_down error: {e}")
        return []


def fetch_broken_board(date_str):
    """炸板数据 - AkShare stock_zt_pool_zbgc_em"""
    cache_key = f"broken_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        df = ak.stock_zt_pool_zbgc_em(date=date_str)
        if df is None or len(df) == 0:
            return []
        
        stocks = []
        for _, row in df.iterrows():
            stocks.append({
                "code": str(row.get('代码', '')),
                "name": str(row.get('名称', '')),
                "pct_chg": float(row.get('涨跌幅', 0)),
                "close": float(row.get('最新价', 0)),
                "amount": float(row.get('成交额', 0)),
                "turnover_ratio": float(row.get('换手率', 0)),
                "limit_times": 0,
                "first_time": str(row.get('首次封板时间', '')),
                "open_times": int(row.get('炸板次数', 1)),
                "industry": str(row.get('所属行业', '')),
                "tag": "炸板",
                "status": "炸板",
            })
        
        cache_set(cache_key, stocks)
        return stocks
    except Exception as e:
        print(f"[AkShare] fetch_broken_board error: {e}")
        return []


def fetch_board_ladder(date_str):
    """连板天梯 - Built from stock_zt_pool_em 连板数 field
    Each stock includes: code, name, close, pct_chg, turnover_ratio, amount, tag, status
    """
    cache_key = f"ladder_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        df = ak.stock_zt_pool_em(date=date_str)
        if df is None or len(df) == 0:
            return {"ladder": [], "highest_board": 0}
        
        max_board = int(df['连板数'].max()) if '连板数' in df.columns else 0
        
        # Group stocks by 连板数 (only >= 2)
        ladder = []
        multi_board = df[df['连板数'] >= 2] if '连板数' in df.columns else pd.DataFrame()
        
        if len(multi_board) > 0:
            for level in sorted(multi_board['连板数'].unique(), reverse=True):
                level_stocks = multi_board[multi_board['连板数'] == level]
                stocks = []
                for _, row in level_stocks.iterrows():
                    limit_times = int(row.get('连板数', 1))
                    stocks.append({
                        "code": str(row.get('代码', '')),
                        "name": str(row.get('名称', '')),
                        "close": float(row.get('最新价', 0) or 0),
                        "pct_chg": float(row.get('涨跌幅', 0) or 0),
                        "turnover_ratio": float(row.get('换手率', 0) or 0),
                        "amount": float(row.get('成交额', 0) or 0),
                        "tag": str(row.get('所属行业', '')),
                        "status": f"{limit_times}连板",
                        "first_time": str(row.get('首次封板时间', '')),
                        "last_time": str(row.get('最后封板时间', '')),
                    })
                ladder.append({
                    "level": int(level),
                    "count": len(stocks),
                    "stocks": stocks,
                })
        
        result = {"ladder": ladder, "highest_board": max_board}
        cache_set(cache_key, result)
        return result
    except Exception as e:
        print(f"[AkShare] fetch_board_ladder error: {e}")
        return {"ladder": [], "highest_board": 0}


def fetch_market_stats(date_str):
    """综合统计: 最高板、炸板率、封板比"""
    cache_key = f"stats_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        # Limit up
        up_stocks = fetch_limit_up(date_str)
        limit_up_count = len(up_stocks)
        
        # Limit down
        down_stocks = fetch_limit_down(date_str)
        limit_down_count = len(down_stocks)
        
        # Broken board
        broken_stocks = fetch_broken_board(date_str)
        broken_count = len(broken_stocks)
        
        # Highest board
        highest_board = 0
        for s in up_stocks:
            if s.get('limit_times', 0) > highest_board:
                highest_board = s['limit_times']
        
        # Broken rate = broken / (limit_up + broken) * 100
        broken_rate = 0.0
        if limit_up_count + broken_count > 0:
            broken_rate = broken_count / (limit_up_count + broken_count) * 100
        
        # Seal ratio = limit_up : limit_down
        seal_ratio = f"{limit_up_count}:{limit_down_count}" if limit_down_count > 0 else f"{limit_up_count}:0"
        
        result = {
            "trade_date": date_str,
            "limit_up_count": limit_up_count,
            "limit_down_count": limit_down_count,
            "broken_count": broken_count,
            "highest_board": highest_board,
            "broken_rate": round(broken_rate, 1),
            "seal_ratio": seal_ratio,
            "data_source": "akshare",
        }
        cache_set(cache_key, result)
        return result
    except Exception as e:
        print(f"[AkShare] fetch_market_stats error: {e}")
        return {
            "trade_date": date_str,
            "limit_up_count": 0,
            "limit_down_count": 0,
            "broken_count": 0,
            "highest_board": 0,
            "broken_rate": 0.0,
            "seal_ratio": "---",
            "data_source": "akshare",
        }


def fetch_concept_heat(date_str=None):
    """概念板块热力 - AkShare stock_board_concept_name_em"""
    cache_key = f"concept_heat_{date_str or 'latest'}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        df = ak.stock_board_concept_name_em()
        if df is None or len(df) == 0:
            return []
        
        concepts = []
        for _, row in df.head(80).iterrows():
            concepts.append({
                "code": str(row.get('板块代码', '')),
                "name": str(row.get('板块名称', '')),
                "change_pct": float(row.get('涨跌幅', 0)),
                "lead_stock": str(row.get('领涨股票', '')),
                "volume": float(row.get('总成交量', 0)),
                "amount": float(row.get('总成交额', 0)),
            })
        
        # Sort by abs change_pct
        concepts.sort(key=lambda x: abs(x['change_pct']), reverse=True)
        cache_set(cache_key, concepts)
        return concepts
    except Exception as e:
        print(f"[AkShare] fetch_concept_heat error: {e}")
        return []


def fetch_industry_heat(date_str=None):
    """行业板块热力 - AkShare stock_board_industry_name_em"""
    cache_key = f"industry_heat_{date_str or 'latest'}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        df = ak.stock_board_industry_name_em()
        if df is None or len(df) == 0:
            return []
        
        sectors = []
        for _, row in df.head(80).iterrows():
            sectors.append({
                "code": str(row.get('板块代码', '')),
                "name": str(row.get('板块名称', '')),
                "change_pct": float(row.get('涨跌幅', 0)),
                "lead_stock": str(row.get('领涨股票', '')),
                "volume": float(row.get('总成交量', 0)),
                "amount": float(row.get('总成交额', 0)),
            })
        
        sectors.sort(key=lambda x: abs(x['change_pct']), reverse=True)
        cache_set(cache_key, sectors)
        return sectors
    except Exception as e:
        print(f"[AkShare] fetch_industry_heat error: {e}")
        return []


def fetch_market_overview(date_str):
    """市场总览: 上涨/下跌/平盘家数 - from stock_zh_a_spot_em"""
    cache_key = f"overview_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        df = ak.stock_zh_a_spot_em()
        if df is None or len(df) == 0:
            # Fallback: estimate from limit data
            return _estimate_up_down_from_limits(date_str)
        
        # Get pct change column
        pct_col = None
        for col in ['涨跌幅', '涨跌百分比']:
            if col in df.columns:
                pct_col = col
                break
        
        if pct_col is None:
            return _estimate_up_down_from_limits(date_str)
        
        df[pct_col] = pd.to_numeric(df[pct_col], errors='coerce')
        df = df.dropna(subset=[pct_col])
        
        if len(df) == 0:
            return _estimate_up_down_from_limits(date_str)
        
        up_count = int((df[pct_col] > 0).sum())
        down_count = int((df[pct_col] < 0).sum())
        flat_count = int((df[pct_col] == 0).sum())
        total = len(df)
        
        result = {
            "up_count": up_count,
            "down_count": down_count,
            "flat_count": flat_count,
            "total": total,
            "trade_date": date_str,
        }
        if up_count > 0 or down_count > 0:
            cache_set(cache_key, result)
        return result
    except Exception as e:
        print(f"[AkShare] fetch_market_overview error: {e}")
        traceback.print_exc()
        return _estimate_up_down_from_limits(date_str)


def _estimate_up_down_from_limits(date_str):
    """Estimate up/down counts from limit data when real-time API unavailable"""
    try:
        stats = fetch_market_stats(date_str)
        limit_up = stats.get('limit_up_count', 0)
        limit_down = stats.get('limit_down_count', 0)
        broken = stats.get('broken_count', 0)
        
        # Rough estimation: if we have 79 limit ups, total market usually has ~2700 up
        # Based on typical A-share market statistics
        if limit_up > 0:
            # Conservative estimate: limit_up is ~3% of total ups
            estimated_up = max(limit_up * 35, 2500)  # At least 2500 if we have limit-ups
            estimated_down = max(limit_down * 40, 2000)
            estimated_flat = 200
            return {
                "up_count": estimated_up,
                "down_count": estimated_down,
                "flat_count": estimated_flat,
                "total": estimated_up + estimated_down + estimated_flat,
                "trade_date": date_str,
                "estimated": True,
            }
    except:
        pass
    return {"up_count": 0, "down_count": 0, "flat_count": 0, "total": 0}


def get_last_trade_date():
    """Get last actual trade date by checking if akshare has data"""
    cache_key = "last_trade_date"
    cached = cache_get(cache_key)
    if cached:
        return cached

    now = datetime.now()
    for i in range(15):
        d = now - timedelta(days=i)
        if d.weekday() >= 5:  # skip weekend
            continue
        date_str = d.strftime('%Y%m%d')
        # Try to fetch limit up data (lightweight check)
        try:
            df = ak.stock_zt_pool_em(date=date_str)
            if df is not None and len(df) > 0:
                cache_set(cache_key, date_str)
                return date_str
        except:
            continue
    return now.strftime('%Y%m%d')


def fetch_stock_quote(code):
    """获取个股实时行情 - AkShare stock_zh_a_spot_em + filter by code"""
    cache_key = f"quote_{code}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        # stock_zh_a_spot_em returns all A-share stocks with real-time data
        # Use cache to avoid repeated full-market fetch
        all_stocks_key = "all_stocks_spot"
        all_data = cache_get(all_stocks_key)
        
        if all_data is None:
            df = ak.stock_zh_a_spot_em()
            if df is None or len(df) == 0:
                return None
            # Build a dict keyed by code for fast lookup
            all_data = {}
            for _, row in df.iterrows():
                stock_code = str(row.get('代码', ''))
                all_data[stock_code] = row
            cache_set(all_stocks_key, all_data)
        
        # Lookup by code
        row = all_data.get(code)
        if row is None:
            # Try with zero-padding
            code_padded = code.zfill(6)
            row = all_data.get(code_padded)
        
        if row is None:
            return None
        
        result = {
            "code": str(row.get('代码', code)),
            "name": str(row.get('名称', '')),
            "price": float(row.get('最新价', 0) or 0),
            "change_pct": float(row.get('涨跌幅', 0) or 0),
            "change_amount": float(row.get('涨跌额', 0) or 0),
            "volume": float(row.get('成交量', 0) or 0),
            "amount": float(row.get('成交额', 0) or 0),
            "open": float(row.get('今开', 0) or 0),
            "high": float(row.get('最高', 0) or 0),
            "low": float(row.get('最低', 0) or 0),
            "pre_close": float(row.get('昨收', 0) or 0),
            "turnover_ratio": float(row.get('换手率', 0) or 0),
        }
        
        if result["price"] > 0:
            cache_set(cache_key, result)
            return result
        return None
    except Exception as e:
        print(f"[AkShare] fetch_stock_quote error for {code}: {e}")
        traceback.print_exc()
        return None


def fetch_stock_individual(code):
    """获取个股行情 - Using stock_bid_ask_em (逐笔) or stock_zh_a_hist for latest data
    This is more reliable than stock_zh_a_spot_em when market is closed"""
    cache_key = f"individual_{code}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    # Determine market prefix for some APIs
    if code.startswith('6') or code.startswith('5') or code.startswith('9'):
        symbol = f"sh{code}"
        market = "sh"
    else:
        symbol = f"sz{code}"
        market = "sz"

    # Method 1: Try stock_zh_a_hist (historical daily) for latest close price
    try:
        # Get last 5 days of history
        end_date = datetime.now().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=15)).strftime('%Y%m%d')
        df = ak.stock_zh_a_hist(symbol=code, period="daily", start_date=start_date, end_date=end_date, adjust="qfq")
        if df is not None and len(df) > 0:
            # Get the most recent row
            latest = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else latest
            
            price = float(latest.get('收盘', 0) or 0)
            if price > 0:
                pre_close = float(prev.get('收盘', 0) or 0) if len(df) > 1 else float(latest.get('开盘', 0) or 0)
                change_pct = 0.0
                if pre_close > 0:
                    change_pct = (price - pre_close) / pre_close * 100
                
                # Try to get stock name from the data or use stock_individual_info_em
                name = ""
                try:
                    info_df = ak.stock_individual_info_em(symbol=code)
                    if info_df is not None and len(info_df) > 0:
                        for _, row in info_df.iterrows():
                            item_name = str(row.get('item', ''))
                            if '股票简称' in item_name or '简称' in item_name:
                                name = str(row.get('value', ''))
                                break
                except:
                    pass
                
                if not name:
                    name = code
                
                result = {
                    "code": code,
                    "name": name,
                    "price": price,
                    "change_pct": round(change_pct, 2),
                    "pre_close": pre_close,
                    "high": float(latest.get('最高', 0) or 0),
                    "low": float(latest.get('最低', 0) or 0),
                    "volume": float(latest.get('成交量', 0) or 0),
                    "amount": float(latest.get('成交额', 0) or 0),
                    "open": float(latest.get('开盘', 0) or 0),
                    "source": "stock_zh_a_hist",
                }
                cache_set(cache_key, result)
                print(f"[AkShare] stock_individual OK for {code}: {name} price={price}")
                return result
    except Exception as e:
        print(f"[AkShare] stock_zh_a_hist error for {code}: {e}")

    # Method 2: Try stock_individual_info_em for basic info
    try:
        info_df = ak.stock_individual_info_em(symbol=code)
        if info_df is not None and len(info_df) > 0:
            info_dict = {}
            for _, row in info_df.iterrows():
                item_name = str(row.get('item', ''))
                item_value = row.get('value', '')
                info_dict[item_name] = item_value
            
            # Try to extract price-related info
            name = info_dict.get('股票简称', '') or info_dict.get('简称', '') or code
            # stock_individual_info_em doesn't always have price, so this is limited
            # But we can at least get the name
            print(f"[AkShare] stock_individual_info_em got name={name} for {code}")
    except Exception as e:
        print(f"[AkShare] stock_individual_info_em error for {code}: {e}")

    return None


def fetch_dragon_tiger(date_str):
    """龙虎榜数据 - AkShare stock_lhb_detail_em + stock_lhb_jgmx_em"""
    cache_key = f"dragon_tiger_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    if not AKSHARE_AVAILABLE:
        return {"stocks": [], "institutions": []}

    result = {"stocks": [], "institutions": [], "trade_date": date_str}

    # Part 1: 龙虎榜详情 - stock_lhb_detail_em
    try:
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}" if len(date_str) == 8 else date_str
        df = ak.stock_lhb_detail_em(
            start_date=formatted_date,
            end_date=formatted_date
        )
        if df is not None and len(df) > 0:
            stocks = []
            for _, row in df.iterrows():
                code = str(row.get('代码', '') or row.get('code', ''))
                name = str(row.get('名称', '') or row.get('name', ''))
                stocks.append({
                    "code": code,
                    "name": name,
                    "close": float(row.get('收盘价', 0) or row.get('close', 0) or 0),
                    "pct_change": float(row.get('涨跌幅', 0) or row.get('pct_change', 0) or 0),
                    "turnover_rate": float(row.get('换手率', 0) or row.get('turnover_rate', 0) or 0),
                    "lhb_net_buy": float(row.get('龙虎榜净买额', 0) or row.get('net_buy', 0) or 0),
                    "lhb_buy": float(row.get('龙虎榜买入额', 0) or row.get('buy_amount', 0) or 0),
                    "lhb_sell": float(row.get('龙虎榜卖出额', 0) or row.get('sell_amount', 0) or 0),
                    "lhb_amount": float(row.get('龙虎榜成交额', 0) or row.get('lhb_amount', 0) or 0),
                    "total_amount": float(row.get('市场总成交额', 0) or row.get('total_amount', 0) or 0),
                    "net_rate": float(row.get('净买额占总成交比', 0) or row.get('net_rate', 0) or 0),
                    "amount_rate": float(row.get('成交额占总成交比', 0) or row.get('amount_rate', 0) or 0),
                    "reason": str(row.get('解读', '') or row.get('上榜原因', '') or row.get('reason', '')),
                })
            result["stocks"] = stocks
            print(f"[AkShare] stock_lhb_detail_em: {len(stocks)} stocks for {date_str}")
    except Exception as e:
        print(f"[AkShare] stock_lhb_detail_em error for {date_str}: {e}")

    # Part 2: 龙虎榜机构明细 - stock_lhb_jgmx_em
    try:
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}" if len(date_str) == 8 else date_str
        df_inst = ak.stock_lhb_jgmx_em(
            start_date=formatted_date,
            end_date=formatted_date
        )
        if df_inst is not None and len(df_inst) > 0:
            institutions = []
            for _, row in df_inst.iterrows():
                code = str(row.get('代码', '') or row.get('code', ''))
                name = str(row.get('名称', '') or row.get('name', ''))
                institutions.append({
                    "code": code,
                    "name": name,
                    "buy_amt": float(row.get('买入额', 0) or row.get('buy', 0) or 0),
                    "sell_amt": float(row.get('卖出额', 0) or row.get('sell', 0) or 0),
                    "net_amt": float(row.get('净额', 0) or row.get('net_buy', 0) or 0),
                    "reason": str(row.get('解读', '') or row.get('reason', '')),
                })
            result["institutions"] = institutions
            print(f"[AkShare] stock_lhb_jgmx_em: {len(institutions)} records for {date_str}")
    except Exception as e:
        print(f"[AkShare] stock_lhb_jgmx_em error for {date_str}: {e}")

    # Part 3: 龙虎榜营业部明细 - stock_lhb_stock_detail_em (per stock, specific seats)
    try:
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}" if len(date_str) == 8 else date_str
        df_stat = ak.stock_lhb_stock_statistic_em(indicator="近一月")
        if df_stat is not None and len(df_stat) > 0:
            # This gives frequently appearing stocks - useful for identifying hot money patterns
            pass  # We'll use the detail data above for now
    except Exception as e:
        pass  # Not critical

    if result["stocks"] or result["institutions"]:
        cache_set(cache_key, result)

    return result


def fetch_dragon_tiger_detail(code, date_str):
    """个股龙虎榜营业部明细 - stock_lhb_stock_detail_em"""
    cache_key = f"dt_detail_{code}_{date_str}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    if not AKSHARE_AVAILABLE:
        return []

    result = []
    try:
        # Get stock detail data: buy/sell seats for the specific stock
        df = ak.stock_lhb_stock_detail_em(
            symbol=code,
            date=f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}" if len(date_str) == 8 else date_str,
            flag="买入"
        )
        if df is not None and len(df) > 0:
            for _, row in df.iterrows():
                result.append({
                    "seat": str(row.get('营业部名称', '') or row.get('exalter', '')),
                    "side": "buy",
                    "buy_amt": float(row.get('买入额', 0) or row.get('buy', 0) or 0),
                    "sell_amt": float(row.get('卖出额', 0) or row.get('sell', 0) or 0),
                    "net_amt": float(row.get('净额', 0) or row.get('net_buy', 0) or 0),
                })
    except Exception as e:
        print(f"[AkShare] stock_lhb_stock_detail_em buy error for {code}/{date_str}: {e}")

    try:
        df = ak.stock_lhb_stock_detail_em(
            symbol=code,
            date=f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}" if len(date_str) == 8 else date_str,
            flag="卖出"
        )
        if df is not None and len(df) > 0:
            for _, row in df.iterrows():
                result.append({
                    "seat": str(row.get('营业部名称', '') or row.get('exalter', '')),
                    "side": "sell",
                    "buy_amt": float(row.get('买入额', 0) or row.get('buy', 0) or 0),
                    "sell_amt": float(row.get('卖出额', 0) or row.get('sell', 0) or 0),
                    "net_amt": float(row.get('净额', 0) or row.get('net_buy', 0) or 0),
                })
    except Exception as e:
        print(f"[AkShare] stock_lhb_stock_detail_em sell error for {code}/{date_str}: {e}")

    if result:
        cache_set(cache_key, result)
    return result


class AkShareHandler(BaseHTTPRequestHandler):
    """HTTP handler for AkShare microservice"""
    
    def log_message(self, format, *args):
        sys.stdout.write(f"[AkShare] {self.client_address[0]} - {format%args}\n")
        sys.stdout.flush()
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))
    
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)
        date_str = get_trade_date(params.get('trade_date', [None])[0])
        
        try:
            if path == '/health':
                self.send_json({"status": "ok", "akshare_available": AKSHARE_AVAILABLE})
            
            elif path == '/limit_up':
                data = fetch_limit_up(date_str)
                self.send_json({"code": 0, "data": {"stocks": data, "count": len(data), "trade_date": date_str, "source": "akshare"}})
            
            elif path == '/limit_down':
                data = fetch_limit_down(date_str)
                self.send_json({"code": 0, "data": {"stocks": data, "count": len(data), "trade_date": date_str, "source": "akshare"}})
            
            elif path == '/broken_board':
                data = fetch_broken_board(date_str)
                self.send_json({"code": 0, "data": {"stocks": data, "count": len(data), "trade_date": date_str, "source": "akshare"}})
            
            elif path == '/board_ladder':
                data = fetch_board_ladder(date_str)
                self.send_json({"code": 0, "data": {**data, "trade_date": date_str, "source": "akshare"}})
            
            elif path == '/market_stats':
                data = fetch_market_stats(date_str)
                self.send_json({"code": 0, "data": data})
            
            elif path == '/concept_heat':
                data = fetch_concept_heat(date_str)
                self.send_json({"code": 0, "data": {"concepts": data, "count": len(data), "trade_date": date_str, "source": "akshare"}})
            
            elif path == '/industry_heat':
                data = fetch_industry_heat(date_str)
                self.send_json({"code": 0, "data": {"sectors": data, "count": len(data), "trade_date": date_str, "source": "akshare"}})
            
            elif path == '/market_overview':
                data = fetch_market_overview(date_str)
                self.send_json({"code": 0, "data": data})
            
            elif path == '/last_trade_date':
                ltd = get_last_trade_date()
                self.send_json({"code": 0, "data": {"trade_date": ltd}})
            
            elif path == '/stock_quote':
                code = params.get('code', [None])[0]
                if not code:
                    self.send_json({"code": -1, "error": "missing code parameter"}, 400)
                    return
                data = fetch_stock_quote(code)
                if data:
                    self.send_json({"code": 0, "data": data})
                else:
                    self.send_json({"code": -1, "error": f"stock {code} not found"}, 404)
            
            elif path == '/stock_individual':
                code = params.get('code', [None])[0]
                if not code:
                    self.send_json({"code": -1, "error": "missing code parameter"}, 400)
                    return
                data = fetch_stock_individual(code)
                if data:
                    self.send_json({"code": 0, "data": data})
                else:
                    self.send_json({"code": -1, "error": f"stock {code} individual data not found"}, 404)
            
            elif path == '/dragon_tiger':
                data = fetch_dragon_tiger(date_str)
                self.send_json({"code": 0, "data": {**data, "trade_date": date_str, "source": "akshare"}})
            
            elif path == '/dragon_tiger_detail':
                code = params.get('code', [None])[0]
                if not code:
                    self.send_json({"code": -1, "error": "missing code parameter"}, 400)
                    return
                data = fetch_dragon_tiger_detail(code, date_str)
                self.send_json({"code": 0, "data": {"seats": data, "code": code, "trade_date": date_str, "source": "akshare"}})
            
            else:
                self.send_json({"error": "Not found", "endpoints": [
                    "/health", "/limit_up", "/limit_down", "/broken_board",
                    "/board_ladder", "/market_stats", "/concept_heat", "/industry_heat",
                    "/market_overview", "/last_trade_date", "/stock_quote", "/stock_individual",
                    "/dragon_tiger", "/dragon_tiger_detail"
                ]}, 404)
        
        except Exception as e:
            print(f"[AkShare] Handler error: {e}")
            traceback.print_exc()
            self.send_json({"code": -1, "error": str(e)}, 500)


def main():
    port = int(os.environ.get('AKSHARE_PORT', '9090'))
    server = HTTPServer(('0.0.0.0', port), AkShareHandler)
    print(f"[AkShare Service] Starting on port {port}")
    print(f"[AkShare Service] AkShare available: {AKSHARE_AVAILABLE}")
    sys.stdout.flush()
    server.serve_forever()


if __name__ == '__main__':
    main()
