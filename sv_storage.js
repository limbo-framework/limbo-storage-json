const fs = require('fs');
const storePath = `${GetResourcePath(GetCurrentResourceName())}/datastore/`;
console.log(`limbo-storage-json firing up storage on ${storePath}`)

if (!fs.existsSync(storePath)){
    console.log("Store path does not exist: Creating!");
    try {
        fs.mkdirSync(storePath, {recursive: true});
    }
    catch(e){
        throw new Error(`Failed to create storage directory: ${e.message}`)
    }
}

let cacheLifetime = GetConvarInt('limboStorageCacheLifetime', 10 * 60 * 1000); // Ten minutes
let cacheGCInterval = GetConvarInt('limboSorageCacheGCInteravl', 1 * 60 * 1000); // One minute
let _CACHE = new LimboCache(cacheLifetime, cacheGCInterval);

const validate = /[^a-zA-Z0-9.\-\:\!\[\]\s]/;
function validPair(section, key){
    if (section && key){

        var sectionViolation = section.match(validate);
        if (sectionViolation){
            return [false, `Section contains '${sectionViolation}'. This is not allowed!`];
        }
        
        var keyViolation = key.match(validate);
        if (keyViolation){
            return [false, `Key contains '${keyViolation}'. This is not allowed!`];
        }
    }
    else {
        if (!section){
            return [false, 'Section not defined'];
        }
        else {
            return [false, 'Key not defined'];
        }
    }
        
    return [true, 'OK'];
}

function getStored(section, key) {
    return new Promise((resolve, reject) => {
        let [valid, violation] = validPair(section, key);
        if (!valid){ reject(violation); }

        let sectionPath = `${storePath}${section}/`;
        let fileName = `${sectionPath}${key}`;
        if (_CACHE.hasKey(section,key)){
            resolve(_CACHE.get(section, key))
        }
        else {
            if (fs.existsSync(fileName)){
                fs.readFile(fileName,(error, data) => {
                    if (error){
                        reject(`Error reading file for ${key} in ${section}: ${error.message}`);
                    }
                    else {
                        let object = JSON.parse(data);
                        _CACHE.set(section, key, object);
                        resolve(object);
                    }
                })
            }
            else {
                reject(`No such key ${key} in section ${section}`);
            }
        }
    });
}
function hasKey(section, key){
    if (_CACHE.hasKey(section, key)){
        return true;
    }
    else {
        let fileName = `${storePath}${section}/${key}`;
        return fs.existsSync(fileName);
    }
}
function setStored(section, key, value){
    return new Promise((resolve, reject)=>{
        let [valid, violation] = validPair(section, key);
        if (!valid){ reject(violation); }
        
        let sectionPath = `${storePath}${section}/`;
        let fileName = `${sectionPath}${key}`;
        if (!fs.existsSync(sectionPath)){
            try {
                fs.mkdirSync(sectionPath, {recursive: true});
            }
            catch(e){
                reject(`Failed to create section path for ${section}: ${e.message}`);
            }
        }
        let buffer;
        try {
            buffer = JSON.stringify(value);
        }
        catch(e){
            reject(`Failed to serialize object for ${section}/${key}: ${e.message}`);
        }
        fs.writeFile(fileName, buffer, (error) => {
            if (error){
                reject(`Failed to write ${section}/${key}: ${error.message}`);
            }
            else{
                _CACHE.set(section, key, value);
                resolve(buffer.length);
            }
        })
    });
}

exports('get', (section, key, cb) => {
    let invoker = GetInvokingResource();
    getStored(section, key)
    .then((value)=>{
        if (cb){
            cb(value);
        }
    })
    .catch((bork)=>{
        console.error(`${invoker} get('${section}','${key}'): ${bork}`);
        cb();
    })
});
exports('set', (section, key, value, cb) => {
    let invoker = GetInvokingResource();
    setStored(section, key, value)
    .then((response)=>{
        if (cb){
            cb(response);
        }
    })
    .catch((bork)=>{
        console.error(`${invoker} set('${section}','${key}'): ${bork}`);
        cb();
    })
});
exports('hasKey', (section, key, cb) => {
    let exists = hasKey(section, key);
    if (cb){
        cb(exists);
    }
    return exists;
})

RegisterCommand('storagecache',(source, args, raw) => {
    if (source === 0){
        if (args[0]){
            if (args[1]){
                if (_CACHE.hasSection(args[0])){
                    if (_CACHE.hasKey(args[0],args[1])){
                        _CACHE.removeKey(args[0],args[1]);
                        console.warn(`Voided cache for ${args[0]}/${args[1]}`);
                    }
                    else {
                        console.warn(`Could not void cache for ${args[0]}/${args[1]} because that key does not exist!`);
                    }
                }
                else {
                    console.warn(`Could not void cache for ${args[0]}/${args[1]} because that section does not exist!`);
                }
            }
            else {
                if (_CACHE.hasSection(args[0])){
                    _CACHE.removeSection(args[0]);
                    console.warn(`Voided cache for the whole ${args[0]} section!`);
                }
                else {
                    console.warn(`Could not void cache for ${args[0]} section: No keys cached!`);
                }
            }
        }
        else {
            console.log('Please specify a cache section (and optionally key) to void.');
            let sectionCount = 0;
            let emtpyCount = 0;
            let keyCount = 0;
            let now = new Date();
            _CACHE.getSections().sort().forEach((section)=>{
                sectionCount++;
                let keys = _CACHE.getKeys(section);
                if (keys.length > 0){
                    keys.sort().forEach((key) => {
                        let age = _CACHE.getAge(section, key, now);
                        console.log(`  ${section}/${key} (${age}/${cacheLifetime} ms)`);
                        keyCount++;
                    });
                }
                else {
                    emtpyCount++;
                }
            });
            console.log(`There are ${keyCount} keys in ${sectionCount} sections`);
            if (emtpyCount > 0){
                console.log(`${emtpyCount} empty sections will be removed in the next cache garbage collection.`);
            }
        }
    }
    else {
        console.log(`Attempt to void limbo-storage-json cache in-game from ${GetPlayerName(source)}`);
    }
}, true);