class TassemarkStorage {
    constructor(section = GetCurrentResourceName()){
        this.section = section;
    }
    get(key, cb){
        exports['limbo-storage'].get(this.section, key, cb);
    }
    set(key, value, cb){
        exports['limbo-storage'].set(this.section, key, value, cb);
    }
    hasKey(key, cb){
        return exports['limbo-storage'].hasKey(this.section, key, cb);
    }
}