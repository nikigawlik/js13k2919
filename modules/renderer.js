import { mod } from "./generator.js";

export class Texture {
    constructor(w, h) {
        this.data = new Array(w*h);
        this.width = w;
        this.height = h;
    }

    // TODO do this compile time / paste manually
    static fromCanvas(canvas) {
        // let canvas = document.createElement("canvas");
        // let w = canvas.width = img.width;
        // let h = canvas.height = img.height;
        // ctx.drawImage(img, 0, 0);
        let w = canvas.width;
        let h = canvas.height;
        let data = canvas.getContext("2d").getImageData(0, 0, w, h).data;
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

const SUPER_TEXT_TIME = 120;

export default class Renderer {
    constructor(generator, canvas) {
        this.generator = generator;
        this.canvas = canvas;
        this.x = 0;
        this.y = 0.5;
        this.z = 0.35;
        this.angle = 0;
        this.horizon = 0.2;

        this.infoText = "";
        this.infoTextStyle = "red";
        this.pizzaPositions = [];
        this.startPos = null;

        this.carFrame = 1;
        this.floorCanvas = null;
        this.spritesheet = null;
    }

    setText(str, style) {
        this.infoText = str.split("").join(" ");
        this.infoTextStyle = style;
    }

    setSuperText(str) {
        this.superText = str;// str.split("").join(" ");
        this.superTextTimer = SUPER_TEXT_TIME;
    }

    async load() {
        this.spritesheet = await this.loadImage("spritesheet");
        this.imgCorolla = [
            this.getImageFromSpritesheet(0, 0, 32, 16),
            this.getImageFromSpritesheet(0, 16, 32, 16),
            this.getImageFromSpritesheet(0, 0, 32, 16, true)
        ];

        this.indexedSprites = [];
        this.indexedSprites[0] = this.getImageFromSpritesheet(32, 0, 32, 32);
        this.indexedSprites[1] = this.getImageFromSpritesheet(80, 0, 32, 32);

        // load tile data
        this.tileTexture = Texture.fromCanvas(await this.getImageFromSpritesheet(64, 0, 16, 16));
        
        this.renderFloorTexture();
        this.renderMinimap();
    }

    async loadImage(name, format = "png") {
        let img = document.createElement("img");
        img.src = `images/${name}.${format}`;
        await new Promise(resolve => { img.onload = resolve });
        return img;
    }

    getImageFromSpritesheet(x, y, w, h, flipX = false) {
        let canvas = document.createElement("canvas");
        // x = w/2; y = h/2;   
        canvas.width = w;
        canvas.height = h;
        let ctx = canvas.getContext("2d");
        if(flipX) ctx.scale(-1,1);
        ctx.drawImage(this.spritesheet, -x - (flipX? w : 0), -y);
        return canvas;
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
                let fac = baseID == 0? (2+COS[dir])/5 : 1;
                
                for(let locX = 0; locX < halfW; locX++) {
                    for(let locY = locX; locY < tileH-locX-1; locY++) {
                        const tp = transform(locX, locY, dir);
                        const sp = transform(locX, locY, id);
                        tex.setAt(x*tileW + tp.x, y*tileH + tp.y, this.tileTexture.sampleAt(sp.x, sp.y).map(v => v*fac));
                    }
                }
            }
        }

        this.floorCanvasData = tex;
    }

    renderMinimap() {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        const w = this.generator.size;
        canvas.width = canvas.height = w;
        let imgDat = ctx.getImageData(0, 0, w, w);
        for(let x = 0; x < w; x++)
        for(let y = 0; y < w; y++) {
            const i = (y * w + x) * 4;
            imgDat.data[i] =
            imgDat.data[i+1] =
            imgDat.data[i+2] = this.generator.sampleFloorMap(x, y)? 0 : 128;
            imgDat.data[i+3] = 255;
        }
        ctx.putImageData(imgDat, 0, 0);
        this.minimap = canvas;
    }

    sampleFloor(x, y) {
        x = mod(x * this.tileTexture.width, this.floorCanvasData.width);
        y = mod(y * this.tileTexture.height, this.floorCanvasData.height);
        let sample = this.floorCanvasData.sampleAt(x,y);
        // return sample.map(v => (1-lum) * 0x22 + lum * v);
        return sample;
    }

    render() {
        let t0 = Date.now();
        const w = this.canvas.width;
        const h = this.canvas.height;
        const d = 180;
        const farPlane = 12; 

        let ctx = this.canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        let imgData = ctx.getImageData(0, 0, w, h);
        const cosAngle = Math.cos(this.angle);
        const sinAngle = Math.sin(this.angle);

        let depthBuffer = new Array(w).fill(0);

        // iterate from front to back
        for (let screenZ = 0; screenZ <= d; screenZ++) {
            // iterate from left to right
            // const relDistance = Math.tan(screenZ / d * 1.57) * 0.125 * farPlane; // tangent bias 
            const relDistance = (screenZ / d)**2 * farPlane; // square bias 
            const rx = relDistance;
            const lum = 1-relDistance/farPlane;
            for (let screenX = 0; screenX < w; screenX++) {
                const ry = relDistance * (screenX / w * 2 - 1);
                const x = this.x + cosAngle * rx - sinAngle * ry;
                const y = this.y + sinAngle * rx + cosAngle * ry;
                const sample = this.generator.sampleHeightmap(x, y);

                const relH = (sample - this.z + relDistance) / (relDistance * 2) + this.horizon; 
                const screenHeight = Math.min(~~(relH * h), h);

                const col = this.sampleFloor(x, y);
                const buf = depthBuffer[screenX];
                for (let screenY = buf; screenY < screenHeight; screenY++) {
                    const worldY = (relH * h - 1 - screenY) * relDistance;
                    const i = ((h - screenY) * w + screenX) * 4;
                    const fac = ~~(1 + mod(worldY, 18) * 2 / 18);
                    for(let j = 0; j < 3; j++)
                        imgData.data[i+j] = (1-lum) * 0x22 + lum * (col[j] * fac);
                    imgData.data[i + 3] = 255;
                }
                if (screenHeight > buf) depthBuffer[screenX] = screenHeight;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        if (this.imgCorolla) {
            let image = this.imgCorolla[this.carFrame];
            ctx.drawImage(image, ~~(w / 2 - image.width / 2), ~~(h * 0.8 - image.height / 2), image.width, image.height);
        }

        // draw pizzas
        
        for(let pizzaPos of this.pizzaPositions) {
            // Crazy pizza math
            const pizzaRY = (pizzaPos.y - (this.y + sinAngle * (pizzaPos.x - this.x) / cosAngle)) / (sinAngle * sinAngle / cosAngle + cosAngle);
            const pizzaRX = (pizzaPos.x - this.x + sinAngle * pizzaRY) / cosAngle;
            const pizzaSX = ((pizzaRY / pizzaRX) + 1) / 2 * w;
            const pizzaSZ = Math.sqrt(pizzaRX / farPlane) * d;
            
            const samplePizza = this.generator.sampleHeightmap(pizzaPos.x, pizzaPos.y);
            const relPizzaH = (samplePizza - this.z + pizzaRX) / (pizzaRX * 2) + this.horizon; 
            const pizzaScale = 1 / pizzaRX; 
            const pizzaSY = ~~(relPizzaH * h);

            if(pizzaSZ > 0) {
                let img = this.indexedSprites[pizzaPos.spriteIndex];
                let pizzaW = img.width * pizzaScale;
                let pizzaH = img.height * pizzaScale;
                ctx.drawImage(img, pizzaSX - pizzaW/2, h-pizzaSY - pizzaH/2, pizzaW, pizzaH);
            }
        }

        ctx.drawImage(this.minimap, 0, 0);
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.rect(mod(this.x, this.generator.size), mod(this.y, this.generator.size), 1, 1);
        ctx.fill();

        // small normal text
        ctx.font = "8px Arial";
        ctx.textAlign = "center";
        let a = (t0%100)/100*Math.PI;
        let tx = w/2 + Math.cos(a);
        let ty = h-5 + Math.sin(a);
        ctx.strokeStyle = "black";
        ctx.fillStyle = this.infoTextStyle;
        ctx.strokeText(this.infoText, tx, ty); 
        ctx.fillText(this.infoText, tx, ty); 

        // super text
        this.superTextTimer--;
        if(this.superTextTimer > 0) {
            let sc = Math.sin((this.superTextTimer/SUPER_TEXT_TIME)**8 * Math.PI);
            let rot = (1 - this.superTextTimer/SUPER_TEXT_TIME) * .5;
            ctx.translate(w/2, h/2);
            ctx.rotate(rot);
            ctx.scale(sc,sc);
            ctx.font = "32px Arial";
            ctx.strokeStyle = "2px solid red";
            ctx.fillStyle = "white";
            ctx.strokeText(this.superText, 0, 0, w*0.8); 
            ctx.fillText(this.superText, 0, 0, w*0.8); 
        }

        let t = (Date.now() - t0);
        // console.log(`render time: ${t}ms, ${1000/t}fps`);
        document.querySelector("footer>p").innerHTML = `render time: ${t}ms, \t${~~(1000 / t)}fps x: ${this.x} y: ${this.y}`;
    }
}