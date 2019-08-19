import { mod } from "./generator.js";

const COLOR_TABLE = [
    0x777777,
    0x121212,
    0x126612,
].map(val => [val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff]);

export class Texture {
    constructor(w, h) {
        this.data = new Array(w*h);
        this.width = w;
        this.height = h;
    }

    static fromImage(img) {
        let canvas = document.createElement("canvas");
        let w = canvas.width = img.width;
        let h = canvas.height = img.height;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        let data = ctx.getImageData(0, 0, w, h).data;
        let texture = new Texture(w, h);
        for(let i = 0; i < w * h; i++) {
            texture.data[i] = [
                data[i*4],
                data[i*4+1],
                data[i*4+2]
            ];
        }
        return texture;
    }
    
    fill(val) {
        this.data = this.data.fill(val);
    }

    sampleAt(x, y) {
        return this.data[y*this.width + x];
    }
    
    setAt(x, y, value) {
        this.data[y*this.width + x] = value;
    }
}

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
        this.floorCanvas = null;
    }

    async load() {
        this.imgCorolla = await this.loadImages("corolla", 3);
        // load tile data
        this.tileTexture = Texture.fromImage(await this.loadImage("tilemap"));
        
        this.renderFloorTexture();
    }

    async loadImage(name, format = "png") {
        let img = document.createElement("img");
        img.src = `images/${name}.${format}`;
        await new Promise(resolve => { img.onload = resolve });
        return img;
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

    renderFloorTexture() {
        const tileW = this.tileTexture.width;
        const halfW = ~~(tileW/2);
        const tileH = this.tileTexture.height;

        let tex = new Texture(this.generator.size * tileW, this.generator.size * tileH);

        const COS = [1, 0, -1, 0];
        const SIN = [0, 1, 0, -1];
        let transform = (x, y, r) => {
            x -= (tileW-1)/2;
            y -= (tileH-1)/2;
            let bufX = COS[r] * x - SIN[r] * y;
            y = SIN[r] * x + COS[r] * y;
            x = bufX;
            x += (tileW-1)/2;
            y += (tileH-1)/2;
            return {x: x, y: y};
        }

        for(let x = 0; x < this.generator.size; x++)
        for(let y = 0; y < this.generator.size; y++) {
            let baseID = this.generator.sampleFloorMap(x, y);
            for(let dir = 0; dir < 4; dir++) {
                const adjDir = (dir+2)%4;
                const id = baseID * 2 + this.generator.sampleFloorMap(x + COS[adjDir], y + SIN[adjDir]);
                // id = 0;
                
                for(let locX = 0; locX < halfW; locX++) {
                    for(let locY = locX; locY < tileH-locX-1; locY++) {
                        const tp = transform(locX, locY, dir);
                        const sp = transform(locX, locY, id);
                        tex.setAt(x*tileW + tp.x, y*tileH + tp.y, this.tileTexture.sampleAt(sp.x, sp.y));
                    }
                }
            }
        }

        
        let canvas = document.createElement("canvas");
        canvas.width = tex.width;
        canvas.height = tex.height;
        document.querySelector("footer").append(canvas);
        let ctx = canvas.getContext("2d");
        this.floorCanvas = canvas;
        let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for(let i = 0; i < tex.width * tex.height; i++) {
            if(!tex.data[i]) continue;
            for(let j = 0; j < 3; j++) {
                imgData.data[i*4+j] = tex.data[i][j];
            }
            imgData.data[i*4+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        this.floorCanvasData = imgData.data;
    }

    sampleFloor(x, y, lum = 1) {
        x = mod(x * this.tileTexture.width, this.floorCanvas.width);
        y = mod(y * this.tileTexture.height, this.floorCanvas.height);
        let i = (y * this.floorCanvas.width + x) * 4;
        return [
            (1-lum) * 0x22 + lum * this.floorCanvasData[i], 
            (1-lum) * 0x22 + lum * this.floorCanvasData[i+1], 
            (1-lum) * 0x22 + lum * this.floorCanvasData[i+2], 
            (1-lum) * 0x22 + lum * this.floorCanvasData[i+3]
        ];
    }

    render() {
        let t0 = Date.now();
        const w = this.canvas.width;
        const h = this.canvas.height;
        const d = 180;
        const farPlane = 12; 
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
            // const relDistance = Math.tan(screenZ / d * 1.57) * 0.125 * farPlane; // tangent bias 
            const relDistance = (screenZ / d)**2 * farPlane; // square bias 
            const rx = relDistance;
            const lum = (1 - screenZ / d);
            for (let screenX = 0; screenX < w; screenX++) {
                const ry = relDistance * (screenX / w * 2 - 1);
                const x = this.x + cosAngle * rx - sinAngle * ry;
                const y = this.y + sinAngle * rx + cosAngle * ry;
                const sample = this.generator.sampleHeightmap(x, y);

                const relH = (sample - this.z + relDistance) / (relDistance * 2) + this.horizon; 
                const screenHeight = Math.min(~~(relH * h), h);

                const col = this.sampleFloor(x, y, lum);
                const buf = depthBuffer[screenX];
                let stripe = 18;
                for (let screenY = buf; screenY < screenHeight; screenY++) {
                    // stripe += Math.random()*0.01;
                    const worldY = (relH * h - 1 - screenY) * relDistance;
                    const i = ((h - screenY) * w + screenX) * 4;
                    imgData.data[i] = col[0] * ~~(mod(worldY, stripe) * 2 / stripe);
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
        document.querySelector("footer>p").innerHTML = `render time: ${t}ms, \t${~~(1000 / t)}fps x: ${this.x} y: ${this.y}`;
    }
}