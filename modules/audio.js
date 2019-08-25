const keys = {
    aMaj: [0,2,3,5,7,8,10],
    eMaj: [-5,-3,-2,0,2,3,5],
    hmm: [0,2,5,7,10]
};

class Channel {
    constructor(audioContext, octave, key, atc, dec, type = "sine", vol) {
        this.ctx = audioContext;
        this.octave = octave;
        this.key = key;
        this.atc = atc / 1000;
        this.dec = dec / 1000;
        this.lastNote = null;
        this.vol = vol;
        
        this.osc = audioContext.createOscillator();
        this.osc.frequency.value = 440 * (2**this.octave)
        this.osc.type = type;
        
        this.gainNode = audioContext.createGain();
        this.gainNode.gain.value = 0;
        this.gainNode.connect(this.ctx.destination);
        this.osc.connect(this.gainNode);

        this.osc.start(audioContext.currentTime);
    }

    triggerNote(note, time) {
        this.lastNote = note;
        if(note == 0) return;
        
        this.osc.detune.value = this.key[(note-1)%this.key.length] * 100;

        let t = time || this.ctx.currentTime;

        this.gainNode.gain.setValueAtTime(0, t);
        this.gainNode.gain.linearRampToValueAtTime(1/3 * this.vol, t + this.atc);
        this.gainNode.gain.linearRampToValueAtTime(0, t + this.atc + this.dec);

    }
}

class Track {
    constructor(notes) {
        this.notes = notes;
    }

    static notes(...notes) {
        return new Track(notes);
    }

    cmul(...notes) {
        return new Track(Track.convolution(this.notes, notes, (a,b) => a*b));
    }

    cadd(...notes) {
        return new Track(Track.convolution(this.notes, notes, (a,b) => (b!=0? a+b : 0)));
    }

    cadd2(...notes) {
        return new Track(Track.convolution(this.notes, notes, (a,b) => (a!=0? a+b : 0)));
    }

    space(length) {
        return new Track(Track.convolution(this.notes, new Array(length), (a,b,i,j) => a * (j==0)));
    }

    static convolution(notes1, notes2, fnc) {
        let newNotes = new Array(notes1.length * notes2.length);
        for(let i = 0; i < notes1.length; i++) {
            for(let j = 0; j < notes2.length; j++) {
                newNotes[i * notes2.length + j] = fnc(notes1[i], notes2[j], i, j);
            }
        }
        return newNotes;
    }

    at(beat) {
        return this.notes[beat % this.notes.length];
    }
}

export default class Audio {
    constructor() {
    }

    start() {
        // Create an audio context
        this.ctx = new AudioContext();
        this.bass = new Channel(this.ctx, -3, keys.aMaj, 1, 124, "square", 0.5);
        this.kick = new Channel(this.ctx, -1, keys.aMaj, 1, 500, "sawtooth", 0.25);
        this.lead = new Channel(this.ctx, -1, keys.aMaj, 1, 400, "sawtooth", .4);

        this.bassTrack = 

        this.beat = 0;
        this.bpm = 450;
        this.t = 0;
        this.lastCtxT = null;

        // window.setInterval(() => this.nextBeat(), 60000/this.bpm);
    }
    
    update() {
        if(!this.ctx) return;

        const ct = this.ctx.currentTime;
        const delta = ct - (this.lastCtxT || ct);
        this.lastCtxT = ct;

        this.t += delta;
        this.bpm += delta * 1;
        this.bass.dec = ((1+Math.sin(this.t / 4)) / 2 * 80 + 30) / 1000;

        const tNext = this.beat * 60/this.bpm;
        if(tNext - this.t < 1) {
            this.nextBeat(tNext);
        }
    }

    nextBeat(time) {
        if(this.beat > 32) this.bass.triggerNote(Track.notes(1,5,1,3).cmul(1,1,1).cmul(1,1,2,2).cadd(1,1,1,1).cmul(1,1).at(this.beat), time);
        if(this.beat > 64) this.kick.triggerNote(Track.notes(1,0,7,0).at(this.beat), time);
        // this.lead.triggerNote(Track.notes(0,7).cadd(1,3,1,5).space(8).cadd2(1,3,5,1).cmul(1,0).at(this.beat), time)
        if(this.beat > 0) this.lead.triggerNote(Track.notes(1,5,1,3).cmul(1,0,1,0,0,0,1,0,0,0,0,0).cadd(1,2,3,4).cmul(1,0).at(this.beat), time);
        this.beat++;
    }
}