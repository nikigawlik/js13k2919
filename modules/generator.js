
const COS = [1, 0, -1, 0];
const SIN = [0, 1, 0, -1];

class NoiseLayer {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.patternTree = {0:{0:{0:{0:{0:{0:{0:{0:{0:{score:1}}},1:{1:{1:{score:1}}}}},1:{0:{0:{0:{0:{score:-1}}}}}},1:{1:{1:{1:{1:{1:{score:-1}}}}}}},1:{0:{0:{1:{0:{0:{1:{score:1}}},1:{1:{1:{score:1}}}}}}}},1:{1:{0:{1:{1:{0:{1:{1:{score:-1}}}}}}}}},1:{0:{0:{1:{0:{0:{1:{0:{0:{score:1}},1:{1:{score:1}}}}}}}},1:{0:{1:{1:{0:{1:{1:{0:{score:-1}}}}}}},1:{0:{0:{0:{0:{0:{0:{score:1}}}},1:{0:{0:{1:{score:1}}}}}},1:{0:{0:{1:{0:{0:{score:1}}}},1:{1:{1:{1:{score:-1}}}}},1:{1:{0:{0:{0:{score:-1}}},1:{1:{1:{score:-1}}}}}}}}}};

        this.data = new Array(this.width * this.height);
        this.accumulator = new Array(this.data.length);

        this.initWidthRandomValues();
    }

    doSimulationStep() {
        this.accumulator.fill(0);

        // unfortunately we hard-code size right now (It's just a prototype...)
        const pw = 3;
        const w = this.width;
        const h = this.height;

        for (let x = 0; x < w; x++)
            for (let y = 0; y < h; y++) {
                // find bad matches, find good matches
                // get neighborhood
                let data = [];
                for (let dy = 0; dy < pw; dy++)
                    for (let dx = 0; dx < pw; dx++) {
                        let index = w * clamp(y + dy, h) + clamp(x + dx, w);
                        data.push(this.data[index]);
                    }
                let score = this.getMatchScore(data);
                if (score != 0) {
                    for (let dy = 0; dy < pw; dy++)
                        for (let dx = 0; dx < pw; dx++) {
                            let index = w *  clamp(y + dy, h) + clamp(x + dx, w);
                            this.accumulator[index] += score;
                        }
                }
            }

        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                let index = y * w + x;
                let mutate = this.accumulator[index] <= 0;
                this.data[index] = mutate ? this.sampleNoise() : this.data[index];
            }
    }

    doPostprocessingStep() {
        for (let x = 0; x < this.width; x++)
            for (let y = 0; y < this.height; y++) {
                let sum = 0;
                for(let d = 0; d < 4; d++)
                    sum += this.getAt(x+COS[d], y+SIN[d]);
                if(sum < 2) 
                    this.data[y*this.width+x] = 0;
            }
    }

    floodFill(x, y, value) {
        let queue = [x,y];
        let initial = this.getAt(x, y);
        for(let i = 0; i < 49; i++){
            if(queue.length == 0) break;
            y = queue.pop();
            x = queue.pop();
            if(this.getAt(x, y) == value) return;
            this.setAt(x, y, value);

            for(let d = 0; d < 4; d++) {
                let adj = this.getAt(x+COS[d], y+SIN[d]);
                if(adj == initial) {
                    queue.push(x+COS[d], y+SIN[d]);
                }
            }
        }
    }

    getAt(x, y) {
        return this.data[(clamp(y, this.height) * this.width) + clamp(x, this.width)];
    }

    setAt(x, y, value) {
        this.data[(clamp(y, this.height) * this.width) + clamp(x, this.width)] = value;
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
                this.data[index] = this.sampleNoise();
            }
    }

    sampleNoise() {
        return Math.random() < 0.5 ? 1 : 0;
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
            for (let i = 0; i < 16; i++) {
                layer.doPostprocessingStep();
            }
        }

        // for(let i = 0; i < 1; i++) {
        //     layers[0].floodFill(~~(Math.random() * size), ~~(Math.random() * size), 1);
        // }

        for (let p of iterateQGrid(size, size)) {
            let dh = Math.min(p.x, size-1-p.x);
            let dv = Math.min(p.y, size-1-p.y);
            let distanceToEdge = Math.min(dh, dv);
            if(distanceToEdge == 0 || (dh == 1 && dv == 1)) 
                layers[0].data[p.index] = 0;
            else if(distanceToEdge == 1) 
                layers[0].data[p.index] = 1;
        }
        
        for (let i = 0; i < 16; i++) {
            layers[0].doPostprocessingStep();
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
        const hm = this.heightmap[(clamp(y, this.size) * this.size) + clamp(x, this.size)];
        return hm || this.sampleGroundHeightmap(x, y);
    }

    sampleGroundHeightmap(x, y) {
        return  0 +
            (Math.sin(y*3.141569*0.25) + Math.sin(x*3.141569*0.25) + 0) * .2;
            // Math.abs(Math.sin(y*3.141569*1) + Math.sin(x*3.141569*1) + 0) * .1 +
            // (Math.tan(x) + Math.tan(y)) *0.1 +
            // Math.atan(x) + Math.atan(y)
        ;
    }
    
    sampleFloorMap(x, y) {
        return this.floorMap[(clamp(y, this.size) * this.size) + clamp(x, this.size)];
    }
}

export function* iterateQGrid(w, h) {
    for (let x = 0; x < w; x++)
        for (let y = 0; y < h; y++) {
            yield { x: x, y: y, index: y*w+x};
        }
}

export function clamp(x, n) {
    return Math.min(Math.max(~~x, 0), n-1);
    // return ~~(((x%n)+n)%n);
}