import NoodelView from '../types/NoodelView';
import { getActiveChild } from '../util/getters';
import { cancelPan } from './noodel-navigate';
import { findNoodeViewModel } from './id-register';

export function enterInspectMode(noodel: NoodelView) {
    
    if (noodel.isInInspectMode) return;
    
    cancelPan(noodel);

    // touch-action: auto on focal noode under inspect mode
    // interferes with Hammer's recognizers, so they must be disabled first
    noodel.hammerJsInstance.get('pan').set({enable: false});
    noodel.hammerJsInstance.get('swipe').set({enable: false});
    
    let focalNoode = getActiveChild(noodel.focalParent);
    
    focalNoode.isInInspectMode = true;
    noodel.isInInspectMode = true;

    if (typeof noodel.options.onEnterInspectMode === 'function') {
        noodel.options.onEnterInspectMode(findNoodeViewModel(noodel, focalNoode.id));
    }
}

export function exitInspectMode(noodel: NoodelView) {

    if (!noodel.isInInspectMode) return;

    noodel.hammerJsInstance.get('pan').set({enable: true});
    noodel.hammerJsInstance.get('swipe').set({enable: true});

    // unset selection
    const sel = window.getSelection ? window.getSelection() : document.getSelection();

    if (sel) {
        if (sel.removeAllRanges) {
            sel.removeAllRanges();
        } 
        else if (sel.empty) {
            sel.empty();
        }
    }

    let focalNoode = getActiveChild(noodel.focalParent);
    
    focalNoode.isInInspectMode = false;
    noodel.isInInspectMode = false;

    if (typeof noodel.options.onExitInspectMode === 'function') {
        noodel.options.onExitInspectMode(findNoodeViewModel(noodel, focalNoode.id));
    }
}