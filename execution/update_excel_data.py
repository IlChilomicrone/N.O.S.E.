import pandas as pd
import json
import os
import sys

# Usa percorsi relativi sicuri partendo dalla cartella del progetto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'Matrice_MCDA_Sensori_Odorigeni_Eni_CLab_V2.xlsx')
OUTPUT_JS_PATH = os.path.join(BASE_DIR, 'js', 'excel_data.js')
TMP_JSON_PATH = os.path.join(BASE_DIR, '.tmp', 'excel_dump.json')

def main():
    print(f"Reading Excel file: {EXCEL_PATH}")
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: File not found at {EXCEL_PATH}")
        sys.exit(1)

    try:
        xls = pd.ExcelFile(EXCEL_PATH)
        output = {}
        output['sheets'] = xls.sheet_names
        
        for sheet in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet, header=None)
            output[sheet] = df.fillna("").to_dict(orient="records")
            
        # Salva un dump JSON intermedio in .tmp (best practice per audit/debug)
        os.makedirs(os.path.dirname(TMP_JSON_PATH), exist_ok=True)
        with open(TMP_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
            
        # Genera il file JS che sarà letto dal browser
        js_content = f"window.EXCEL_DATA = {json.dumps(output, ensure_ascii=False, indent=2)};\n"
        
        os.makedirs(os.path.dirname(OUTPUT_JS_PATH), exist_ok=True)
        with open(OUTPUT_JS_PATH, 'w', encoding='utf-8') as f:
            f.write(js_content)
            
        print(f"Success! JS file generated at: {OUTPUT_JS_PATH}")
        print(f"Total sheets parsed: {len(xls.sheet_names)}")
        
    except Exception as e:
        print(f"Error during execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
