let random = Math.random;
let sign = Math.sign;
let sin = Math.sin;
let min = Math.min;
let max = Math.max;
const PI = Math.PI;

export default class Audio {
    constructor() {
        this.ctx = new AudioContext();
    }

    start() {
        // Create an audio context

        const srate = 12000;
        const length = 1 << 20;
        let musicBuffer = this.ctx.createBuffer(1, length, srate);
        let data = musicBuffer.getChannelData(0);

        let flavor;
        
        let b = 0;
        for(let i = 0; i < 5; i++) {
            b = b | ~~(random() * 4);
            b = b << 2;
        }
        // look at those magic numbers!
        let bs = [
            773752, // very fast upbeat
            773752, // very fast upbeat
            773752|0x7f, // very fast upbeat
            957758312, // fast ish

            773752, // very fast upbeat
            773752, // very fast upbeat
            773752|0x7f, // very fast upbeat
            957758312, // fast ish

            792323628, // noisy? slow
            792323628, // noisy? slow
            957758312, // fast ish
            957758312, // fast ish

            1008437436, // fast ish synth
            1008437436, // fast ish synth
            773752|0x7f, // very fast upbeat
            957758312, // fast ish

            // -409420504, // interesting medium
            // 792323628,// noisy? slow
            // 345849296, // continuus subbase
            // 1962361744, // fast tension
        ];
        // let bs = [345849296,1962361744,957758312,792323628,773752,1008437436,773752,792323628,773752,792323628];

        for(let t = 0; t < length; t++) {
            const env = 1-(t % (1<<12) / (1<<12));
            const env2 = 1-(t % (1<<15) / (1<<15));
            const env3 = 1-(t % (1<<10) / (1<<10));
            let hihat1 = (random()*2-1)*env**32 * 0.5;
            let hihat2 = (random()*2-1)*env3**32 * 1.9;
            let kick = sin(env**6*0x6f)*env;
            let snare = (random()*2-1)*env**4;
            if(t % (1<<15) == 0) flavor = ~~(random() * 2048);
            if(t % (1<<16) == 0) {
                // this is how magic numbers are originally made!
                // for(let i = 0; i < 5; i++) {
                //     b = b | ~~(random() * 4);
                //     b = b << 2;
                // }
                // bs.push(b);
                b = bs.shift();
            };
            let tt = t;
            t = t & b;
            data[tt] = 
                [[kick,hihat1,snare,hihat1][(t>>12)%4] * 0.4, [kick,snare,hihat1,hihat2][(t>>12)%4] * 0.4][max((t>>14)%4-2, 0)]
                + sign(sin((t&((1<<(5-(t>>14)%3+(t>>12)%6))-1))*(1/64)*PI*(1+env2*.25))) * 0.05
                + sign(sin((t&(flavor << 4))*(1/64)*PI)) * 0.05
                // + sign(sin((t&([32,2,3,111][(t>>15)%4] << 4))*(1/64)*PI)) * 0.1
                + data[max(0, t - 2100)] * 0.4
                + data[max(0, t - 2000)] * 0.4
            ;
            t = tt;
        }
        
        console.log(bs.toString());

        let musicSource = this.ctx.createBufferSource();
        musicSource.buffer = musicBuffer;
        musicSource.loop = true;

        musicSource.connect(this.ctx.destination);
        musicSource.start();
    }
    
    update() {
    }
}