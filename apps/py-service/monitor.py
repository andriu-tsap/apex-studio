"""Compare the controlled HTML demo source with the previous snapshot and export XLSX."""
import argparse
import json
from pathlib import Path
from openpyxl import Workbook
from main import parse_prices, ROOT

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path('data'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    snapshot = args.output / 'prices.json'
    previous = json.loads(snapshot.read_text()) if snapshot.exists() else []
    old = {item['id']: item['amount'] for item in previous}
    current = parse_prices((ROOT / 'fixtures/prices.html').read_text())
    book = Workbook()
    sheet = book.active
    sheet.title = 'Controlled demo prices'
    sheet.append(['Item', 'Price PLN', 'Change PLN', 'Source'])
    for item in current:
        label = item['name']
        if label.startswith(('=', '+', '-', '@')):
            label = "'" + label
        sheet.append([label, item['amount'] / 100, (item['amount'] - old.get(item['id'], item['amount'])) / 100, 'bundled-demo'])
    book.save(args.output / 'prices.xlsx')
    snapshot.write_text(json.dumps(current, indent=2))
    print('Saved controlled demo price snapshot and Excel report.')

if __name__ == '__main__':
    main()
