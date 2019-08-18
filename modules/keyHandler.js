var keys = {};

registerKey("left", [65, 37]);
registerKey("right", [68, 39]);
registerKey("up", [87, 38]);
registerKey("down",[83, 40]);


export function registerKey(key, keyCodes) {
    keys[key] = false;
    document.addEventListener("keydown", (ev) => { 
        if(keyCodes.includes(ev.keyCode)) {
            ev.preventDefault();
            keys[key] = true;
        }
    });
    document.addEventListener("keyup", (ev) => {
        if(keyCodes.includes(ev.keyCode)) {
            ev.preventDefault();
            keys[key] = false;
        }
    });
}

export function keyIsDown(key) {
    return !!keys[key];
}