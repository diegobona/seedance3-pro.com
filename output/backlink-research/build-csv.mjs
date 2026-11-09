import fs from 'node:fs/promises';
import {Workbook} from '@oai/artifact-tool';
const dir=new URL('./',import.meta.url);
const data=JSON.parse(await fs.readFile(new URL('final_data.json',dir),'utf8'));
const wb=Workbook.create();
const files=[['main','外链候选','seedance3-pro-backlinks-2026-11-07.csv'],['pending','待补核验','seedance3-pro-backlinks-pending-2026-11-07.csv']];
for(const [key,name] of files){
 const sh=wb.worksheets.add(name);
 const matrix=[data.headers,...data[key]];
 sh.getRange(`A1:K${matrix.length}`).values=matrix;
 if(JSON.stringify(sh.getRange(`A1:K${matrix.length}`).values)!==JSON.stringify(matrix))throw new Error(`Value mismatch ${name}`);
}
wb.recalculate();
const results=[];
for(const [key,name,file] of files){
 const sh=wb.worksheets.getItem(name);
 const matrix=sh.getRange(`A1:K${data[key].length+1}`).values;
 // The public artifact API exposes CSV import but no CSV export. Serialize its verified values as RFC4180 CSV.
 const csv='\uFEFF'+matrix.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
 await fs.writeFile(new URL('../'+file,dir),csv,'utf8');
 const imported=await Workbook.fromCSV(csv.replace(/^\uFEFF/,''),{sheetName:'Readback'});
 const actual=imported.worksheets.getItemAt(0).getRange(`A1:K${matrix.length}`).values;
 if(JSON.stringify(actual)!==JSON.stringify(matrix))throw new Error(`CSV round trip mismatch ${file}`);
 results.push({file,rows:matrix.length-1,columns:matrix[0].length,encoding:'UTF-8 BOM',roundtrip:'exact'});
}
console.log(JSON.stringify(results));
await fs.writeFile(new URL('csv_validation.json',dir),JSON.stringify(results,null,2));
