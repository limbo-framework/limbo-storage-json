class LimboCache {
    constructor(lifetime = 10 * 60 * 1000, gcInterval = 1 * 60 * 1000){
        this.lifetime = lifetime;
        this.gc = setInterval(this.garbageCollect, gcInterval, this);
        this.data = {};
    }
    garbageCollect(cache){
        cache.getSections().forEach(async (section) => {
            let keys = cache.getKeys(section);
            if (keys.length === 0){
                // console.log(`The whole ${section} section was empty!`);
                cache.removeSection(section);
            }
            else {
                let now = new Date();
                keys.forEach(async (key)=>{
                    if (cache.data[section] && cache.data[section][key]){
                        let age = now - cache.data[section][key].time;
                        if (age > cache.lifetime){
                            // console.log(`Cache lifetime is up for ${key} in ${section}`);
                            cache.removeKey(section,key);
                        }
                    }
                    await Delay(0);
                });
            }
            await Delay(0);
        });
    }
    get(section, key){
        if (this.hasKey(section, key)){
            this.data[section][key].time = new Date();
            return this.data[section][key].data;
        }
    }
    getOrBuild(section, key, builder){
        if (this.hasKey(section, key)){
            return this.get(section, key);
        }
        else {
            let value = builder();
            this.set(section, key, value);
            return value;
        }
    }
    set(section, key, value){
        if (!this.hasSection(section)){
            this.data[section] = {};
        }
        this.data[section][key] = {
            time : new Date(),
            data : value
        }
    }
    removeSection(section){
        if (this.hasSection(section)){
            delete this.data[section];
            return true;
        }
        return false;
    }
    removeKey(section, key){
        if (this.hasKey(section, key)){
            delete this.data[section][key];
            return true;
        }
        return false;
    }
    hasSection(section){
        return (this.data[section]);
    }
    hasKey(section, key){
        return (this.data[section] && this.data[section][key]);
    }
    getSections(){
        let sections = Object.keys(this.data);
        return sections;
    }
    getKeys(section){
        if (this.hasSection(section)){
            return Object.keys(this.data[section]);
        }
        else {
            return [];
        }
    }
    getAge(section, key, compare = new Date()){
        if (this.hasKey(section,key)){
            return compare - this.data[section][key].time;
        }
        else {
            return -1;
        }
    }
}