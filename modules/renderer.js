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
        this.z = 0.25;
        this.angle = 0;

        this.imgCorolla = document.querySelector("img#corolla");
    }

    render() {
        let t0 = Date.now();
        let w = this.canvas.width;
        let h = this.canvas.height;
        let d = 128;
        let farPlane = 16; // units
        // let nearPlane = .1; // units
        let fovRatio = 1;

        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        let imgData = ctx.getImageData(0, 0, w, h);
        

        // iterate from z to 1
        for(let screenZ = d; screenZ>=0; screenZ--) {
            // iterate from left to right
            for(let screenX = 0; screenX < w; screenX++) {
                // TODO implement rotation
                let val = (screenZ/d) * (screenZ/d) * farPlane
                let rx = val;
                let ry = val * (screenX/w * 2 - 1);
                let x = this.x + Math.cos(this.angle) * rx - Math.sin(this.angle) * ry;
                let y = this.y + Math.sin(this.angle) * rx + Math.cos(this.angle) * ry;
                let sample = this.generator.sampleHeightmap(x, y);
                let screenHeight = (sample - this.z + val) / (val*2) * h;
                screenHeight = Math.min(Math.floor(screenHeight), h);
                screenHeight += 32;
                // screenHeight = 16 + val;
                // render a vertical scanline
                let col = sample > 0? 
                    [1, 1, 1].map(v => (1-screenZ/d)*255)
                :
                    COLOR_TABLE[this.generator.sampleFloorMap(x, y)]
                ;
                
                for(let screenY = 0; screenY < screenHeight; screenY++) {
                    let i = (h-screenY) * w + screenX;
                    imgData.data[i*4] = col[0]
                    imgData.data[i*4+1] = col[1]
                    imgData.data[i*4+2] = col[2];
                    imgData.data[i*4+3] = 255;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);

        ctx.drawImage(this.imgCorolla, w/2 - this.imgCorolla.width/2, h*0.8 - this.imgCorolla.height/2);

        let t = (Date.now() - t0);
        // console.log(`render time: ${t}ms, ${1000/t}fps`);
    }
}