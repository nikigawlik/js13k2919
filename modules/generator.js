// import PatternEditor from "./patternEditor.js";
// import { perlin2, seed } from "./noise.js";

class NoiseLayer {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.patternTree = JSON.parse('{"0":{"0":{"0":{"0":{"0":{"0":{"0":{"0":{"0":{"score":1}}},"1":{"1":{"1":{"score":1}}}}},"1":{"0":{"0":{"0":{"0":{"score":-1}}}}}},"1":{"1":{"1":{"1":{"1":{"1":{"score":-1}}}}}}},"1":{"0":{"0":{"1":{"0":{"0":{"1":{"score":1}}},"1":{"1":{"1":{"score":1}}}}}}}},"1":{"1":{"0":{"1":{"1":{"0":{"1":{"1":{"score":-1}}}}}}}}},"1":{"0":{"0":{"1":{"0":{"0":{"1":{"0":{"0":{"score":1}},"1":{"1":{"score":1}}}}}}}},"1":{"0":{"1":{"1":{"0":{"1":{"1":{"0":{"score":-1}}}}}}},"1":{"0":{"0":{"0":{"0":{"0":{"0":{"score":1}}}},"1":{"0":{"0":{"1":{"score":1}}}}}},"1":{"0":{"0":{"1":{"0":{"0":{"score":1}}}},"1":{"1":{"1":{"1":{"score":-1}}}}},"1":{"1":{"0":{"0":{"0":{"score":-1}}},"1":{"1":{"1":{"score":-1}}}}}}}}}}');

        this.noiseOffset = 0;

        this.data = new Array(this.width * this.height);
        this.accumulator = new Array(this.data.length);

        this.initWidthRandomValues();
    }

    doSimulationStep() {
        for (let i = 0; i < this.accumulator.length; i++) {
            this.accumulator[i] = 0;
        }

        // unfortunately we hard-code size right now (It's just a prototype...)
        const pw = 3;
        for (let x = 0; x < this.width - (pw - 1); x++)
            for (let y = 0; y < this.height - (pw - 1); y++) {
                // find bad matches, find good matches

                // get neighborhood
                let data = [];
                for (let dy = 0; dy < pw; dy++)
                    for (let dx = 0; dx < pw; dx++) {
                        let index = this.width * (y + dy) + x + dx;
                        data.push(this.data[index]);
                    }
                let score = this.getMatchScore(data);
                if (score != 0) {
                    for (let dy = 0; dy < pw; dy++)
                        for (let dx = 0; dx < pw; dx++) {
                            let index = this.width * (y + dy) + x + dx;
                            this.accumulator[index] += score;
                        }
                }
            }

        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++) {
                let index = y * this.width + x;
                let mutate = this.accumulator[index] <= 0;
                this.data[index] = mutate ? this.sampleNoise(x, y) : this.data[index];
            }
    }

    getMatchScore(data) {
        let node = this.patternTree;
        for (let i = 0; i < data.length; i++) {
            if (!node[data[i]]) {
                return 0;
            }
            node = node[data[i]];
        }

        return node.score;
    }

    initWidthRandomValues() {
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++) {
                // seed(Date.now()); // TODO implement seed?
                let index = y * this.width + x;
                this.data[index] = this.sampleNoise(x, y);
            }
    }

    sampleNoise(x, y) {
        return Math.random() < 0.5 + this.noiseOffset ? 1 : 0;
    }
}

// TODO separate logic for drawing and world gen! (and generally clean up this hacky code)

export default class Generator {
    constructor(size) {
        let layers = [1, 1, 1, 1].map(f => new NoiseLayer(f * size, f * size));
        // simulate noise and overlay
        for (let layer of layers) {
            for (let i = 0; i < 100; i++) {
                layer.doSimulationStep();
            }
        }

        let heightmap = []
        let bottomLayer = layers[0].data;

        let canvi = [];
        for (let i = 0; i < layers.length; i++) {
            canvi.push(document.createElement("canvas"));
            canvi[i].width = canvi[i].height = size;
        }
        let canvidats = canvi.map(c => c.getContext("2d").getImageData(0, 0, size, size));

        for (let p of iterateQGrid(size, size)) {
            let i = p.y * size + p.x;
            //(p.y * sim.height / MAX_W) * sim.width + (p.x * sim.width / MAX_W)
            let height = layers.map((sim) => (1 - sim.data[i])).reduce((a, b) => a + b);
            height = layers[0].data[i] ? 0 : height;

            // dat.data[i*4] = 
            // dat.data[i*4 + 1] =
            // dat.data[i*4 + 2] = val;
            // dat.data[i*4 + 3] = 255;


            for (let j = 0; j < height; j++) {
                let val = Math.floor(j / layers.length * 155 + 100);
                let dat = canvidats[j];
                dat.data[i * 4] =
                    dat.data[i * 4 + 1] =
                    dat.data[i * 4 + 2] = val;
                dat.data[i * 4 + 3] = 255;
            }
        }

        for (let i = 0; i < layers.length; i++) {
            canvi[i].getContext("2d").putImageData(canvidats[i], 0, 0);
            canvi[i].style.transform = `translateZ(${i * 10}px)`
            // canvi[i].style.transform = `scale3d(${scale},${scale},${scale}) rotateX(45deg) rotateZ(45deg) translate3d(${dx}px, ${dy}px, ${i*depthScale}px) `;
        }

        let container = document.querySelector("#canvasStack");
        for (let canvas of canvi) {
            container.append(canvas);
        }
    }
}

function* iterateQGrid(w, h) {
    for (let x = 0; x < w; x++)
        for (let y = 0; y < h; y++) {
            yield { x: x, y: y, index: y*w+x};
        }
}

window.addEventListener("load", () => {
    new Generator(64);
})