import { startPan, updatePan, releasePan, doJumpNavigation, shiftFocalNoode, shiftFocalLevel } from './noodel-navigate';
import Hammer from 'hammerjs';
import NoodelState from '../types/NoodelState';
import { exitInspectMode, enterInspectMode } from './inspect-mode';
import { throttle } from './throttle';
import { getActiveChild } from './getters';

function onKeyDown(noodel: NoodelState, ev: KeyboardEvent) {   
    
    if (checkInputPreventClass(noodel, ev, 'nd-prevent-key')) return;

    if (ev.key === "Shift") {
        noodel.isShiftKeyPressed = true;
    }
    else if (ev.key === "Enter") {
        if (!noodel.options.useInspectModeKey) return;
        if (noodel.isInInspectMode) {
            exitInspectMode(noodel);
        }
        else {
            enterInspectMode(noodel);
        }
    }

    if (!noodel.options.useKeyNavigation) return;
    if (noodel.isInInspectMode) return;

    if (ev.key === "ArrowDown") {
        shiftFocalNoode(noodel, 1);
    }
    else if (ev.key === "ArrowUp") {
        shiftFocalNoode(noodel, -1);
    }
    else if (ev.key === "ArrowLeft") {
        shiftFocalLevel(noodel, -1);
    }
    else if (ev.key === "ArrowRight") {
        shiftFocalLevel(noodel, 1);
    }
    else if (ev.key === " " || ev.key === "Spacebar") {
        if (noodel.isShiftKeyPressed) {
            shiftFocalNoode(noodel, -3);
        }
        else {
            shiftFocalNoode(noodel, 3);
        }
    }
    else if (ev.key === "PageDown") {
        if (noodel.isShiftKeyPressed) {
            shiftFocalLevel(noodel, 3);
        }
        else {
            shiftFocalNoode(noodel, 3);
        }
    }
    else if (ev.key === "PageUp") {
        if (noodel.isShiftKeyPressed) {
            shiftFocalLevel(noodel, -3);
        }
        else {
            shiftFocalNoode(noodel, -3);
        }
    }
    else if (ev.key === "Home") {
        if (noodel.isShiftKeyPressed) {
            shiftFocalLevel(noodel, Number.MIN_SAFE_INTEGER);
        }
        else {
            shiftFocalNoode(noodel, Number.MIN_SAFE_INTEGER);
        }
    }
    else if (ev.key === "End") {
        if (noodel.isShiftKeyPressed) {
            shiftFocalLevel(noodel, Number.MAX_SAFE_INTEGER);
        }
        else {
            shiftFocalNoode(noodel, Number.MAX_SAFE_INTEGER);
        }
    }
}

function onKeyUp(noodel: NoodelState, event: KeyboardEvent) {
    if (event.key === "Shift") {
        noodel.isShiftKeyPressed = false;
    }
}

function onWheel(noodel: NoodelState, ev: WheelEvent) {

    if (!noodel.options.useWheelNavigation) return;
    if (noodel.isInInspectMode) return;
    if (checkInputPreventClass(noodel, ev, 'nd-prevent-wheel')) return;

    if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
        if (noodel.isShiftKeyPressed) {
            if (ev.deltaY > 0) {
                shiftFocalLevel(noodel, 1);
            }
            else if (ev.deltaY < 0) {
                shiftFocalLevel(noodel, -1);
            }
        }
        else {
            if (ev.deltaY > 0) {
                shiftFocalNoode(noodel, 1);
            }
            else if (ev.deltaY < 0) {
                shiftFocalNoode(noodel, -1);
            }
        }      
    }
    else if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
        if (noodel.isShiftKeyPressed) {
            if (ev.deltaY > 0) {
                shiftFocalNoode(noodel, 1);
            }
            else if (ev.deltaY < 0) {
                shiftFocalNoode(noodel, -1);
            }
        }
        else {
            if (ev.deltaX > 0) {
                shiftFocalLevel(noodel, 1);
            }
            else if (ev.deltaX < 0) {
                shiftFocalLevel(noodel, -1);
            }
        }      
    }
}

function onPanStart(noodel: NoodelState, ev: HammerInput) {

    if (!noodel.options.useSwipeNavigation) return;
    if (noodel.isInInspectMode) return;
    if (checkInputPreventClass(noodel, ev.srcEvent, 'nd-prevent-swipe')) return;

    startPan(noodel, ev);
}

function onPan(noodel: NoodelState, ev: HammerInput) {
    if (ev.isFinal) return;
    if (noodel.panAxis === null) return;

    updatePan(noodel, ev);
}

function onPanEnd(noodel: NoodelState, ev: HammerInput) {
    if (noodel.panAxis === null) return;

    releasePan(noodel, ev); 
}

function onTap(noodel: NoodelState, ev: HammerInput) {

    if (noodel.panAxis !== null) return;
    if (checkInputPreventClass(noodel, ev.srcEvent, 'nd-prevent-tap')) return;

    if ((ev as any).tapCount === 1) {
        if (!noodel.options.useTapNavigation) return;
        if (noodel.isInInspectMode) return;        
        if (noodel.pointerUpSrcNoode) {
            let target = noodel.pointerUpSrcNoode;

            if (noodel.options.retainDepthOnTapNavigation && !target.isChildrenVisible) {
                let levelDiff = getActiveChild(noodel.focalParent).level - target.level;

                for (let i = 0; i < levelDiff; i++) {
                    let next = getActiveChild(target);
                    
                    if (next) {
                        target = next;
                    }
                    else {
                        break;
                    }
                }
            }
                
            doJumpNavigation(noodel, target);
        }
    }
    else if ((ev as any).tapCount === 2) {
        if (!noodel.options.useInspectModeDoubleTap) return;
        if (noodel.isInInspectMode) {
            exitInspectMode(noodel);
        }
        else {
            enterInspectMode(noodel);
        }
    }
}

function checkInputPreventClass(noodel: NoodelState, ev: Event, className: string): boolean {
    
    let target = ev.target;

    while (true) {
        let classList = (target as any).classList;

        if (classList && classList.contains(className)) {
            return true;
        }

        if (target === noodel.canvasEl) {
            return false;
        }

        target = (target as any).parentElement;

        if (!target) return false;
    }
}

export function setupCanvasInput(el: HTMLDivElement, noodel: NoodelState) {

    el.addEventListener('keydown', (ev: KeyboardEvent) => throttle(noodel, 'keydown', () => onKeyDown(noodel, ev), 60));
    el.addEventListener('keyup', (ev: KeyboardEvent) => onKeyUp(noodel, ev));
    el.addEventListener('wheel', (ev: WheelEvent) => throttle(noodel, 'wheel', () => onWheel(noodel, ev), 80));

    const manager = new Hammer.Manager(el);

    let pan = new Hammer.Pan({threshold: 10, direction: Hammer.DIRECTION_ALL});
    let singleTap = new Hammer.Tap({taps: 1, posThreshold: 100});
    let doubleTap = new Hammer.Tap({taps: 2, posThreshold: 100});

    manager.add([pan, doubleTap, singleTap]);

    singleTap.recognizeWith(doubleTap);

    manager.on("panstart", (ev) => onPanStart(noodel, ev));
    manager.on("pan", (ev) => onPan(noodel, ev));
    manager.on("panend", (ev) => onPanEnd(noodel, ev));
    manager.on('tap', (ev) => onTap(noodel, ev));

    noodel.hammerJsInstance = manager;
}