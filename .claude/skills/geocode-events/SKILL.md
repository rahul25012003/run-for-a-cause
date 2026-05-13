---
name: geocode-events
description: Auto-fill events' latitude / longitude from their `city` field using Nominatim (free OpenStreetMap geocoder, no API key). Use after adding the events.lat/lng columns and seeded city strings, before showing the India map.
allowed-tools: PowerShell, Bash
---

# Geocode events

Nominatim (https://nominatim.org/) is the free OSM geocoding service.
Has a 1-request-per-second rate limit and requires a User-Agent header.

## Prerequisite

Events must have a `city` column AND `latitude` / `longitude` (nullable)
columns. Add via migration if missing (use `/new-migration`).

## Command

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -c @"
import asyncio
import time
import httpx
from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models.event import Event

NOMINATIM = 'https://nominatim.openstreetmap.org/search'
HEADERS = {'User-Agent': 'RunForACause/1.0 (rfac-dev)'}

async def geocode(city: str) -> tuple[float, float] | None:
    async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as c:
        r = await c.get(NOMINATIM, params={
            'q': f'{city}, India',
            'format': 'json',
            'limit': 1,
            'countrycodes': 'in',
        })
        r.raise_for_status()
        data = r.json()
        if not data:
            return None
        return float(data[0]['lat']), float(data[0]['lon'])

async def m():
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            select(Event.id, Event.title, Event.city)
            .where(Event.city.is_not(None))
            .where((Event.latitude.is_(None)) | (Event.longitude.is_(None)))
        )
        for eid, title, city in rows.all():
            try:
                latlng = await geocode(city)
                if latlng:
                    lat, lng = latlng
                    await db.execute(
                        update(Event).where(Event.id == eid)
                        .values(latitude=lat, longitude=lng)
                    )
                    print(f'  {title:50s} | {city:20s} -> {lat:.4f}, {lng:.4f}')
                else:
                    print(f'  {title:50s} | {city:20s} -> not found')
            except Exception as exc:
                print(f'  {title:50s} | ERROR: {exc}')
            time.sleep(1.1)  # Rate limit: 1 req/sec
        await db.commit()
asyncio.run(m())
"@
```

## After

The India map page (`/map`) should now show pins at the geocoded
coordinates. If a city wasn't found, it stays NULL — manager can
override manually via the event edit form (when that field is added).

## Don't

- Don't run this in a tight loop without `time.sleep(1.1)` — Nominatim will
  rate-limit your IP and refuse further requests for ~24h.
- Don't change the `User-Agent` to something that looks like a bot.
- For production-scale geocoding (thousands of events), use Mapbox or
  Google Maps with an API key instead.
