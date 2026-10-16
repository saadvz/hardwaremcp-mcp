import fs from 'fs';
const S=JSON.parse(fs.readFileSync(process.argv[2]||'../hardwaremcp/data/servers.json','utf8')).map(({slug,name,owner,repo,devices,category,language,transport,stars,last_updated,description,can_do,kind,commands,config,notes,requires})=>({slug,name,owner,repo,devices,category,language:language??null,transport,stars:stars??null,last_updated:last_updated??null,description,can_do,kind,commands:commands??[],config:config??null,notes:notes??[],requires:requires??[]}));
fs.writeFileSync('src/data.ts','// Generated from hardwaremcp/data/servers.json by gen-data.mjs\nconst SERVERS = '+JSON.stringify(S)+';\nexport default SERVERS;\n');
console.log(S.length,'entries');
