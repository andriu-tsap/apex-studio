from io import BytesIO
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from main import app, Estimate, calculate, parse_prices
client = TestClient(app)
TOKEN = {"X-Service-Token": "local-demo-service-token"}

def test_shared_formula_vectors():
    for service, base in [("detail",65000),("ceramic",180000),("ppf",420000)]:
        for size, multiplier in [("coupe",100),("sedan",115),("suv",130)]:
            for extra in [False, True]:
                assert calculate(Estimate(service=service,size=size,extra=extra))["amount"] == base*multiplier//100+(20000 if extra else 0)

def test_validation():
    assert client.post('/estimate',json={"service":"unknown","size":"coupe"}).status_code == 422
    assert client.post('/estimate',json={"service":"detail","size":"suv","extra":"false"}).status_code == 422

def test_pdf_is_protected_and_valid():
    data={"id":"demo-1","name":"Демо клієнт","date":"2027-01-10","service":"ceramic","size":"coupe","extra":False}
    assert client.post('/estimate/pdf',json=data).status_code == 401
    result=client.post('/estimate/pdf',json=data,headers=TOKEN)
    assert result.status_code == 200 and result.content.startswith(b'%PDF-')

def test_excel_contains_numeric_money():
    result=client.post('/reports/excel',json={"rows":[{"month":"2026-11","revenue":65000,"bookings":1,"running":65000}]},headers=TOKEN)
    assert result.status_code == 200
    sheet=load_workbook(BytesIO(result.content)).active
    assert sheet['B2'].value == 650 and sheet['C2'].value == 1

def test_parser_uses_controlled_fixture():
    result=client.get('/prices').json()
    assert result['demo'] and len(result['items']) == 3
    assert all(item['source']=='bundled-demo' for item in result['items'])
