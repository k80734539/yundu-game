import { Game } from './core/Game';
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const game = new Game(canvas, ui);
game.boot();
// 自動測試可用 ?autostart=1 跳過標題
if (new URLSearchParams(location.search).has('autostart')) game.begin(false, '測試員');
else game.ui.showTitle();
