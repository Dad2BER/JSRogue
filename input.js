export class InputHandler {
    constructor() {
        this.keys = [];
        window.addEventListener('keydown', e=>{
            if ( this.keys.indexOf(e.key)===-1) {
                this.keys.push(e.key);            
            }
        });
        window.addEventListener('keyup', e=> {
            let i = this.keys.indexOf(e.key);
            if ( i != -1) {
                this.keys.splice(i, 1);
            }
        });
    }
}