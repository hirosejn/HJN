export {hello}; // export文を使ってhello関数を定義する。
import {message1, message2} from './message.js';
function hello() { alert(message1() + message2()); }