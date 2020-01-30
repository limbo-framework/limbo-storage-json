LimboStorage = {}

function LimboStorage:new(section)
    section = section or GetCurrentResourceName()
    local object = {
        section = section,
    }
    setmetatable(object, self)
    self.__index = self

    return object
end

function LimboStorage:get(key, cb)
    exports['limbo-storage']:get(self.section, key, cb);
end
function LimboStorage:set(key, value, cb)
    exports['limbo-storage']:set(self.section, key, value, cb);
end
function LimboStorage:hasKey(key, cb)
    return exports['limbo-storage']:hasKey(self.section, key, cb);
end
