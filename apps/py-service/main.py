"""APEX demo automation. No remote scraper targets or AI keys are required."""
import hmac
import io
import os
from pathlib import Path
from typing import Literal
from datetime import date
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, ConfigDict
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from openpyxl import Workbook
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
TOKEN = os.environ.get("SERVICE_TOKEN", "local-demo-service-token")
app = FastAPI(title="APEX automation — Concept / demo", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","), allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
pdfmetrics.registerFont(TTFont("Apex", str(ROOT / "assets/DejaVuSans.ttf")))

class Estimate(BaseModel):
    model_config = ConfigDict(strict=True)
    service: Literal["detail", "ceramic", "ppf"]
    size: Literal["coupe", "sedan", "suv"]
    extra: bool = False

class Document(Estimate):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=2, max_length=100)
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")

class Row(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    revenue: int = Field(ge=0)
    bookings: int = Field(ge=0)
    running: int = Field(ge=0)

class Report(BaseModel):
    rows: list[Row] = Field(max_length=1200)

def authorize(x_service_token: str = Header(default="")):
    if not hmac.compare_digest(x_service_token, TOKEN):
        raise HTTPException(401, "Service token required")

def calculate(data: Estimate):
    base = {"detail": 65000, "ceramic": 180000, "ppf": 420000}[data.service]
    amount = base * {"coupe": 100, "sedan": 115, "suv": 130}[data.size] // 100
    return {"amount": amount + (20000 if data.extra else 0), "currency": "PLN", "version": "2026-01", "source": "python"}

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/estimate")
def estimate(data: Estimate):
    return calculate(data)

@app.post("/estimate/pdf", dependencies=[Depends(authorize)])
def estimate_pdf(data: Document):
    date.fromisoformat(data.date)
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=(595, 842))
    pdf.setTitle("APEX — demo estimate")
    pdf.setFillColorRGB(.04, .05, .07)
    pdf.rect(0, 0, 595, 842, fill=1, stroke=0)
    pdf.setFont("Apex", 26)
    pdf.setFillColorRGB(0, .94, 1)
    pdf.drawString(48, 770, "APEX STUDIO")
    pdf.setFillColorRGB(.96, .97, .99)
    pdf.setFont("Apex", 12)
    lines = ["CONCEPT / DEMO PROJECT — ESTIMATE", f"Reference: {data.id}", f"Customer: {data.name}", f"Service: {data.service}", f"Vehicle: {data.size}", f"Date: {data.date}", f"Interior extra: {'yes' if data.extra else 'no'}", f"Total: {calculate(data)['amount'] / 100:.2f} PLN", "Formula version: 2026-01", "Illustrative estimate. No actual services are sold."]
    for index, line in enumerate(lines):
        pdf.drawString(48, 710 - index * 34, line)
    pdf.save()
    return Response(output.getvalue(), media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="apex-estimate.pdf"'})

@app.post("/reports/excel", dependencies=[Depends(authorize)])
def reports_excel(data: Report):
    book = Workbook()
    sheet = book.active
    sheet.title = "Demo revenue"
    sheet.append(["Month", "Completed revenue (PLN)", "Bookings", "Running revenue (PLN)"])
    for row in data.rows:
        sheet.append([row.month, row.revenue / 100, row.bookings, row.running / 100])
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for column in ["A", "B", "C", "D"]:
        sheet.column_dimensions[column].width = 28
    sheet.append([])
    sheet.append(["Concept / demo data"])
    output = io.BytesIO()
    book.save(output)
    return Response(output.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="apex-report.xlsx"'})

def parse_prices(html: str):
    soup = BeautifulSoup(html, "html.parser")
    return [{"id": item["data-id"], "name": item.select_one(".name").get_text(strip=True), "amount": int(item["data-grosz"]), "currency": "PLN", "source": "bundled-demo"} for item in soup.select("article[data-id][data-grosz]")]

@app.get("/prices")
def prices():
    return {"demo": True, "items": parse_prices((ROOT / "fixtures/prices.html").read_text())}
