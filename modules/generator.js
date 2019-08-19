import Renderer from "./renderer.js";

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

export default class Generator {
    constructor(size) {
        this.size = size;

        let layers = [1, 1, 1, 1].map(f => new NoiseLayer(f * size, f * size));
        // simulate noise and overlay
        for (let layer of layers) {
            for (let i = 0; i < 100; i++) {
                layer.doSimulationStep();
            }
        }

        this.floorMap = layers[0].data;
        this.heightmap = []

        // calculate height map
        for (let p of iterateQGrid(size, size)) {
            let height = layers.map((sim) => (1 - sim.data[p.index])).reduce((a, b) => a + b);
            height = layers[0].data[p.index] ? 0 : height;
            this.heightmap[p.index] = height;
        }
    }

    sampleHeightmap(x, y) {
        // return 0;
        // return Math.random() < 0.05? .5 : 0;
        // if(x >= this.size || y >= this.size || x < 0 || y < 0) return 0;
        const hm = this.heightmap[(mod(y, this.size) * this.size) + mod(x, this.size)];
        return hm || (Math.sin(y*3.141569*0.25) + Math.sin(x*3.141569*0.25) + 0) * 0.2;
    }
    
    sampleFloorMap(x, y) {
        return this.floorMap[(mod(y, this.size) * this.size) + mod(x, this.size)];
    }
}

function* iterateQGrid(w, h) {
    for (let x = 0; x < w; x++)
        for (let y = 0; y < h; y++) {
            yield { x: x, y: y, index: y*w+x};
        }
}

export function mod(x, n) {
    return ~~(((x%n)+n)%n);
}