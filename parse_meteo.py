import pandas as pd
import json
import math

file_path = "analisi_comparativa_stazioni_meteo (1).ods"
out_path = ".tmp/meteo_dump.json"

try:
    # Get all sheet names
    excel_file = pd.ExcelFile(file_path, engine="odf")
    sheet_names = excel_file.sheet_names
    
    data = {"sheets": sheet_names}
    
    for sheet in sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet, engine="odf", header=None)
        
        # Convert df to list of dicts, ensuring nan are replaced with empty strings
        sheet_data = []
        for i, row in df.iterrows():
            row_dict = {}
            for j, val in enumerate(row):
                if pd.isna(val) or (isinstance(val, float) and math.isnan(val)):
                    row_dict[str(j)] = ""
                else:
                    row_dict[str(j)] = str(val)
            sheet_data.append(row_dict)
            
        data[sheet] = sheet_data
        
    out_path = "js/meteo_data.js"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("window.METEO_DATA = ")
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write(";\n")
        
    print(f"Successfully dumped data to {out_path}")
except Exception as e:
    print(f"Error parsing {file_path}: {e}")
