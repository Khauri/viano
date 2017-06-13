const {Instrument, helpers} = require('../Base');
const Key = require('./Key');
/**
 * Viano.js 
 * ===
 * A customizable (V)irtual Piano for your website
 * 
 * Part of the Virtualso suite of es6 virtual instruments 
 * 
 * @author AnotherBlacKid
 */
module.exports = class Viano extends Instrument{
    constructor(...opts){
        super({ 
            range: ["C", 12],
            /**
             * Display settings
             */
            noteNames : false,
            noOverlap : false,
            // generic key settings
            keyOptions : {
                width : null,
                height : null
            },
            // specific key settings
            white: {
                width : null, // auto-generate
                height : null,
                fill : "#f7f7f7",
                stroke : "#222",
                lineWidth : 5, // border stroke width
                render : null,
            },
            black: {
                width : null, // auto-generate
                height : null,
                fill : "#333",
                stroke : "#333",
                render : null,
            },
            "[[private]]": {
                keys : [],
                data : {
                    accidentals : 0,
                    naturals : 0
                }
            }
        },
        ...opts);
        // set up the view and such
        this._init();
        // generate the viano
        this._generate();

        this.render();
    }
    /**
     * Gets a specific key by its note value 
     * @returns Key if found, null if not
     */
    getKeyByNote( note ){
        return null;
    }

    /**
     * Chainable shortcut for this.keys.map
     */
    forEachKey( cb ){
        this.keys.map(cb);
        return this;
    }

    /**
     * Trigger one or more keys
     */
    trigger(keys, val, callEvent = true){
        if(typeof keys === "string")
            keys = keys.split(/\s/g); // split string by spaces
        keys.map((key)=>{
            if(key.toLowerCase() === "all") // trigger all keys
                this.keys.map((k)=>{k.trigger(val)});
            else{
                let info = helpers.parseNote(key);
                this.keys.map((k)=>{
                    if(k.note.toUpperCase() === info.note.toUpperCase()){ //if it's the same note
                        if(isNaN(info.octave) || info.octave === k.octave) // same octave or none specified
                            k.trigger(val);
                    }
                });
            }
        });
        this.render();
        return this;
    }

    /**
     * Releases all keys in an array or string
     * @param {*} keys 
     */
    release(keys){
        if(typeof keys === "string")
            keys = keys.split();
        keys.map((key)=>{
            key = key.toLowerCase()
            if(key === "all")
                this.keys.map((k)=>{k.trigger(0)});
        });
        return this;
    }

    /**
     * Renders the Viano by rendering each key
     */
    render(){
        super.render(); // Performs the rotations and what-not so they needn't be worried about
        let view = this.view;
        let ctx = view.getContext('2d');
            //ctx.clearRect(this.top, this.left, this.width, this.height);
        let keys = this.keys;
        let x = this.left + this.pad[0] || 1, 
            y = this.top + this.pad[1] || 1;
            /*width = helpers.getFirstDefined( 
                        this.white.width,
                        this.keyOptions.width,
                        (this.width - this.pad[0] - this.pad[2]) / (this.data.naturals) // calculate
                    ),
            height = helpers.getFirstDefined(
                        Math.max(this.white.height || 0, this.black.height || 0),
                        this.keyOptions.height,
                        this.height - this.pad[1] - this.pad[3]
                    );*/
            //
            let wWidth = this.white.width ||
                         this.keyOptions.width ||
                         (this.width - this.pad[0] - this.pad[2]) / (this.data.naturals + (this.noOverlap ? this.data.accidentals : 0)),

                bWidth = this.black.width ||
                         this.keyOptions.width ||
                         this.noOverlap ? wWidth : wWidth / 2,

                wHeight = this.white.height ||
                          this.keyOptions.height ||
                          (this.height - this.pad[1] - this.pad[3]),

                bHeight = this.black.height ||
                          this.keyOptions.height || 
                          this.noOverlap ? wHeight : wHeight / 1.5;
                        
        let top, left, kWidth, kHeight;
        keys.map((key, index)=>{
            top = y;
            if(key.accidental){
                ctx.globalCompositeOperation = "source-over";
                if(this.noOverlap){
                    left = x;
                    x += bWidth; 
                }else{
                    left = x - bWidth / 2;
                }
                key.render(ctx, left, top, bWidth, bHeight);
            }else{
                ctx.globalCompositeOperation = "destination-over";
                // new
                left = x;
                x += wWidth;
                key.render(ctx, left, top, wWidth, wHeight);
            }
        });
    }
    /**
     * Returns the note at a particular position
     */
    getKeyAtPosition(x, y){
        let keys = this.keys,
            res = [];
        for(let i = 0; i < keys.length; i++){
            if(keys[i]._isInIntersection(x, y)){
                res.push(keys[i]);
            }
        }
        // reduce results to a single value
        // good enough for now tbh
        return res.reduce((a, c)=>{
            if(!a) return c;
            if(a.accidental && c.accidental) 
                return a.zIndex > c.zIndex ? a : c;
            else 
                return a.accidental ? a : c;
        }, null);
    }

    mousedown(e){

    }
    /**
     * This method is called when any key is triggered on the keyboard
     */
    set onTrigger( func ){

    }

    /* Getters */

    /**
     * Set the notemap
     */
    set notemap( map ){
        this.notemap = map;
    }
    /**
     * 
     */
    /*get keys(){
        return this["[[private]]"].keys;
    }*/
    /* Private methods */

    /**
     * Initializes the view and sets the dimensions
     */
    _init(){
        // the getter (this.view) automagically creates the view if it doesn't exist
        this.view.width = this.width; 
        this.view.height = this.height;
    }

    /**
     * Generate all the keys using the range
     */
    _generate(){
        // First parse the range into a start note and then the amount of notes to generate
        if(typeof this.range === "string")
            this.range = this.range.replace(/\s/gi,"").split(/[ ,-]/gi);
        
        let init = this.range[0],
            final = this.range[1] || 12;

        // Parse init value (should always be a string)
        let [, startNote, startAcc = "", startOct = 0] = init.toUpperCase().match(/([a-g])([#sb])?(\d+)?/i); startOct = parseInt(startOct);

        let keysToGenerate;
        // one easy case if it's already a number
        if(typeof final === "number")
            keysToGenerate = final;
        // two cases if it's a string
        else if (/^\d+/.test(final))
            keysToGenerate = parseInt(final);
        else{
            let [, endNote, endAcc = "", endOct = 0] = final.toUpperCase().match(/([a-g])([#sb])?(\d+)?/i); endOct = parseInt(endOct);
            if(startOct > endOct || ((startOct == endOct) && (endNote < startNote) && (startNote <= 'B')))
                throw `Impossible Generation Range from ${init} to ${final}!`
            keysToGenerate = 1 + this.scheme.indexOf(endNote) - this.scheme.indexOf(startNote) + (endOct - startOct) * this.scheme.length;
        }

        // generate the keys
        let octave = startOct, 
            key, note, accidental;
        let index = this.scheme.indexOf(startNote + startAcc); // doesn't currently account for using b or s.

        for(let i = 0; i < keysToGenerate; i++, index = (index + 1) % this.scheme.length){
            note = this.scheme[index];
            [, accidental = false] = note.match(/[a-g]([#sb])?/i);
            key = new Key(this, {
                note : note,
                accidental : accidental,
                octave : octave,
                options : accidental ? this.black : this.white
            });
            // track accidentals and naturals
            if(accidental) this.data.accidentals ++;
            else this.data.naturals ++;

            this.keys.push(key);
            // increase the octave (?)
            if(index == this.scheme.length-1){
                octave++;
            }
        }
    }
    /**
     * Finds the index of a note in this viano's notemap
     */
    _index_of_note( note ){
        
    }

    /// event hooks ///
    __viewEventHook(data){
        if(data.x && data.y)
            data.key = this.getKeyAtPosition(data.x, data.y);
    }
    /// getters ///
    get data(){
        return this["[[private]]"].data;
    }

    get keys(){
        return this["[[private]]"].keys;
    }
}