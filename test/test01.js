class Hook {
    constructor() {
        this.hooks = [];
    }

    get(object, funcName) {
        return this.hooks.find(hook => hook.object === object && hook.funcName === funcName);
    }

    
    set(object, funcName, before, after) {
        let hook = this.get(object, funcName);
        if (hook) {
            hook.before = before;
            hook.after = after;
            return;
        }

        let originalFunc = object[funcName];

        hook = { object, funcName, originalFunc, before, after };
        this.hooks.push(hook);

        object[funcName] = function () {
            let newArgs;
            if (typeof hook.before === "function") {
                newArgs = hook.before.apply(this, arguments);
            }
            let result = originalFunc.apply(this, newArgs || arguments);
            if (typeof hook.after === "function") {
                hook.after.apply(this, newArgs || arguments);
            }
            return result;
        };
    }

    unset(object, funcName) {
        let hook = this.get(object, funcName);
        if (hook) {
            object[funcName] = hook.originalFunc;
            return this.hooks.splice(this.hooks.indexOf(hook), 1)[0];
        }
        return false;
    }

    reset() {
        this.hooks.forEach(hook => {
            hook.object[hook.funcName] = hook.originalFunc;
        });
        this.hooks = [];
    }
}

// Usage example:
let hook = new Hook();

hook.set(
    console,
    "log",
    function () {
        alert(`[Before] ${arguments[0]}`);
        arguments[0] = `${arguments[0]} (hooked)`;
        return arguments;
    },
    function (msg) {
        alert(`[After] ${msg}`);
    }
);

console.log("Hello");

hook.unset(console, "log");

console.log("Hello");