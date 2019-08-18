const COLOR_TABLE = [
    0x777777,
    0x121212,
    0x126612,
].map(val => [val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff]);

export default class Renderer {
    constructor(generator, canvas) {
        this.generator = generator;
        this.canvas = canvas;
        this.x = 0;
        this.y = 0.5;
        this.z = 0.35;
        this.angle = 0;
        this.horizon = 0.2;

        this.carFrame = 1;
    }

    async load() {
        // TODO maybe put this in a separate async function and change game logic to only start after load
        this.imgCorolla = await this.loadImages("corolla", 3);
        this.imgTiles = await this.loadImages("tiles", 9);
        // load tile data
        this.tileData = [];
        let canvas = document.createElement('canvas');
        canvas.width = this.imgTiles[0].width;
        canvas.height = this.imgTiles[0].height;
        let ctx = canvas.getContext('2d');
        for (let tile of this.imgTiles) {
            ctx.drawImage(tile, 0, 0);
            this.tileData.push(ctx.getImageData(0, 0, tile.width, tile.height).data);
        }
    }

    async loadImages(name, numberOfFrames, format = "png") {
        let images = [];
        let promises = [];
        for (let i = 0; i < numberOfFrames; i++) {
            let img = document.createElement("img");
            img.src = `images/${name}${("000" + i).slice(-4)}.${format}`;
            promises.push(new Promise(resolve => { img.onload = resolve }));
            images.push(img);
        }

        for (let promise of promises) {
            await promise;
        }
        return images;
    }

    render() {
        let t0 = Date.now();
        const w = this.canvas.width;
        const h = this.canvas.height;
        const d = 180;
        const farPlane = 1; // not actually a far plane anymore bec. of tangent bias
        // let nearPlane = .1; // units
        // let fovRatio = 1;

        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        let imgData = ctx.getImageData(0, 0, w, h);
        const cosAngle = Math.cos(this.angle);
        const sinAngle = Math.sin(this.angle);

        let depthBuffer = new Array(w).fill(0);

        // iterate from z to 1
        // for (let screenZ = d; screenZ >= 0; screenZ--) {
        for (let screenZ = 0; screenZ <= d; screenZ++) {
            // iterate from left to right
            const relDistance = Math.tan(screenZ / d * 1.57) * farPlane
            const rx = relDistance;
            const lum = (1 - screenZ / d) * 255;
            for (let screenX = 0; screenX < w; screenX++) {
                const ry = relDistance * (screenX / w * 2 - 1);
                const x = this.x + cosAngle * rx - sinAngle * ry;
                const y = this.y + sinAngle * rx + cosAngle * ry;
                const sample = this.generator.sampleHeightmap(x, y);
                // ~~ ist essentially Math.floor
                const screenHeight = Math.min(~~((sample - this.z + relDistance) / (relDistance * 2) * h + this.horizon * h), h);
                // render a vertical scanline
                const col = sample > 0 ?
                    [lum, lum, lum]
                    :
                    COLOR_TABLE[this.generator.sampleFloorMap(x, y)];
                ;
                const buf = depthBuffer[screenX];
                for (let screenY = buf; screenY < screenHeight; screenY++) {
                    let i = ((h - screenY) * w + screenX) * 4;
                    imgData.data[i] = col[0]
                    imgData.data[i + 1] = col[1]
                    imgData.data[i + 2] = col[2];
                    imgData.data[i + 3] = 255;
                }
                if (screenHeight > buf) depthBuffer[screenX] = screenHeight;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        if (this.imgCorolla) {
            let image = this.imgCorolla[this.carFrame];
            ctx.drawImage(image, ~~(w / 2 - image.width / 2), ~~(h * 0.8 - image.height / 2));
        }

        let t = (Date.now() - t0);
        // console.log(`render time: ${t}ms, ${1000/t}fps`);
        document.querySelector("footer").innerHTML = `render time: ${t}ms, \t${~~(1000 / t)}fps`;
    }

    sampleFloor() {

    }
}