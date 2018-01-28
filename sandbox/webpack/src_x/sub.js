export {hello}; // export文を使ってhello関数を定義する。
import {message1, message2} from './message.js';
import * as A from './messageA.js';
import * from './messageB.js';

function hello() {
    alert(  message1() + message2() + 
            A.messageA1() + A.messageA2() +
            util.B1() + util.B2() +
            );
}
