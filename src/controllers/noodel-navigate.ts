import { setActiveChild, setFocalParent, hideActiveSubtree, showActiveSubtree, handleFocalNoodeChange } from "@/controllers/noodel-mutate";
import { Axis } from '@/enums/Axis';
import NoodeView from '@/types/NoodeView';
import NoodelView from '@/types/NoodelView';
import { getActiveChild, getFocalWidth, getFocalHeight } from '@/util/getters';
import { alignTrunkToBranch, alignBranchToIndex } from './noodel-align';
import { forceReflow } from '@/controllers/noodel-animate';
import { exitInspectMode } from './inspect-mode';

/**
 * Core function for panning the trunk to a specified position, changing the focal parent
 * or set limit indicators as necessary. Makes no assumption on the magnitude of the movement, 
 * and aims to be correct regardless of the target offset, bounding the movement to the possible limits.
 */
function panTrunk(noodel: NoodelView, targetOffset: number) {

    let offsetDiff = targetOffset - noodel.trunkOffsetAligned;
    let targetFocalParent = noodel.focalParent;
    let alignedOffsetDiff = 0;

    noodel.showLimits.right = false;
    noodel.showLimits.left = false;

    // takes the offset difference, reduce it branch by branch to find the target focal parent
    if (offsetDiff < 0) { // revealing right
        while (getActiveChild(targetFocalParent).activeChildIndex !== null) {
            offsetDiff += targetFocalParent.branchSize / 2;
            
            if (offsetDiff >= 0) break;

            alignedOffsetDiff -= targetFocalParent.branchSize / 2;
            targetFocalParent = getActiveChild(targetFocalParent);
            alignedOffsetDiff -= targetFocalParent.branchSize / 2;
            
            offsetDiff += targetFocalParent.branchSize / 2;
        }

        // check if diff exceeds trunk offset limit
        if (offsetDiff < 0) {
            noodel.showLimits.right = true;
            targetOffset -= offsetDiff; // adjust target offset to boundary
        }
    }
    else if (offsetDiff > 0) { // revealing left
        while (targetFocalParent.parent !== null) {

            offsetDiff -= targetFocalParent.branchSize / 2;
            
            if (offsetDiff <= 0) break;

            alignedOffsetDiff += targetFocalParent.branchSize / 2;
            targetFocalParent = targetFocalParent.parent;
            alignedOffsetDiff += targetFocalParent.branchSize / 2;
            
            offsetDiff -= targetFocalParent.branchSize / 2;
        }

        // check if diff exceeds trunk offset limit
        if (offsetDiff > 0) {
            noodel.showLimits.left = true;
            targetOffset -= offsetDiff; // adjust target offset to boundary
        }
    }

    if (targetFocalParent.id !== noodel.focalParent.id) {
        setFocalParent(noodel, targetFocalParent);
        noodel.trunkOffsetAligned += alignedOffsetDiff;
    }

    noodel.trunkOffset = targetOffset;
}

/**
 * Core function for panning the focal branch to a specified position.
 * Changes active noode or set limit indicators as necessary.
 * Makes no assumption on the magnitude of the movement, and aims to be correct
 * regardless of the target offset, bounding the movement to the possible limits.
 */
function panFocalBranch(noodel: NoodelView, targetOffset: number) {

    let offsetDiff = targetOffset - noodel.focalParent.childBranchOffsetAligned;
    let targetIndex = noodel.focalParent.activeChildIndex;
    let alignedOffsetDiff = 0;

    noodel.showLimits.top = false;
    noodel.showLimits.bottom = false;

    // takes the offset difference, reduce it noode by noode to find the target index
    if (offsetDiff < 0) { // revealing bottom
        while (targetIndex < noodel.focalParent.children.length - 1) {
            offsetDiff += noodel.focalParent.children[targetIndex].size / 2;
             
            if (offsetDiff >= 0) break;

            alignedOffsetDiff -= noodel.focalParent.children[targetIndex].size / 2;
            targetIndex++;
            alignedOffsetDiff -= noodel.focalParent.children[targetIndex].size / 2;
            
            offsetDiff += noodel.focalParent.children[targetIndex].size / 2;
        }

        // check if diff exceeds branch offset limit
        if (offsetDiff < 0) { // revealing top
            noodel.showLimits.bottom = true;
            targetOffset -= offsetDiff; // adjust target offset to boundary
        }
    }
    else if (offsetDiff > 0) {
        while (targetIndex > 0) {
            offsetDiff -= noodel.focalParent.children[targetIndex].size / 2;
            
            if (offsetDiff <= 0) break;

            alignedOffsetDiff += noodel.focalParent.children[targetIndex].size / 2;
            targetIndex--;
            alignedOffsetDiff += noodel.focalParent.children[targetIndex].size / 2;
            
            offsetDiff -= noodel.focalParent.children[targetIndex].size / 2;
        }

        // check if diff exceeds branch offset limit
        if (offsetDiff > 0) {
            noodel.showLimits.top = true;
            targetOffset -= offsetDiff; // adjust target offset to boundary
        }
    }

    if (targetIndex !== noodel.focalParent.activeChildIndex) {
        hideActiveSubtree(getActiveChild(noodel.focalParent));
        setActiveChild(noodel, noodel.focalParent, targetIndex);
        showActiveSubtree(noodel, noodel.focalParent, noodel.options.visibleSubtreeDepth, noodel.options.subtreeDebounceInterval);
        noodel.focalParent.childBranchOffsetAligned += alignedOffsetDiff; 
    }

    noodel.focalParent.childBranchOffset = targetOffset;
}

export function startPan(noodel: NoodelView, ev: HammerInput) {

    clearTimeout(noodel.limitIndicatorTimeout);

    if (ev.direction === Hammer.DIRECTION_LEFT || ev.direction === Hammer.DIRECTION_RIGHT) {
        noodel.panAxis = Axis.HORIZONTAL;

        // finds the current trunk offset with getBoundingClientRect, even if trunk is in transition,
        // taking into account the canvas's position as it may not be full page
        let currentTrunkOffset = noodel.trunkEl.getBoundingClientRect().left - noodel.canvasEl.getBoundingClientRect().left - getFocalWidth(noodel);

        noodel.applyTrunkMove = false;
        noodel.trunkOffset = currentTrunkOffset;
        noodel.panOffsetOriginTrunk = currentTrunkOffset;
    }
    else if (ev.direction === Hammer.DIRECTION_UP || ev.direction === Hammer.DIRECTION_DOWN) {
        noodel.panAxis = Axis.VERTICAL;

        // finds the current focal branch offset with getBoundingClientRect, even if branch is in transition,
        // taking into account the canvas's position as it may not be full page
        let currentFocalBranchOffset = noodel.focalBranchEl.getBoundingClientRect().top - noodel.canvasEl.getBoundingClientRect().top - getFocalHeight(noodel);

        noodel.focalParent.applyBranchMove = false;
        noodel.focalParent.childBranchOffset = currentFocalBranchOffset;
        noodel.panOffsetOriginFocalBranch = currentFocalBranchOffset;
    }
}

export function updatePan(noodel: NoodelView, ev: HammerInput) {

    let prevFocalNoode = getActiveChild(noodel.focalParent);

    if (!prevFocalNoode) return;

    if (noodel.panAxis === Axis.HORIZONTAL) {
        panTrunk(noodel, noodel.panOffsetOriginTrunk + (ev.deltaX * noodel.options.swipeMultiplierTrunk));     
    }
    else if (noodel.panAxis === Axis.VERTICAL) {
        panFocalBranch(noodel, noodel.panOffsetOriginFocalBranch + (ev.deltaY * noodel.options.swipeMultiplierBranch));
    }

    handleFocalNoodeChange(noodel, prevFocalNoode, getActiveChild(noodel.focalParent));
}

export function releasePan(noodel: NoodelView, ev: HammerInput) {

    if (noodel.panAxis === Axis.HORIZONTAL) {
        noodel.panOffsetOriginTrunk = null;
        noodel.panAxis = null; // before shiftFocalLevel to prevent extra cancelPan check
        shiftFocalLevel(noodel, computeSnapCount(ev.velocityX, noodel.options.snapMultiplierTrunk));
    }
    else if (noodel.panAxis === Axis.VERTICAL) {
        noodel.panOffsetOriginFocalBranch = null;
        noodel.panAxis = null; // before shiftFocalNoode to prevent extra cancelPan check
        shiftFocalNoode(noodel, computeSnapCount(ev.velocityY, noodel.options.snapMultiplierBranch));
    }

    unsetLimitIndicators(noodel);
}

export function cancelPan(noodel: NoodelView) {

    if (noodel.panAxis === Axis.HORIZONTAL) {
        noodel.panOffsetOriginTrunk = null;
        noodel.panAxis = null;
        shiftFocalLevel(noodel, 0);
    }
    else if (noodel.panAxis === Axis.VERTICAL) {
        noodel.panOffsetOriginFocalBranch = null;
        noodel.panAxis = null;
        shiftFocalNoode(noodel, 0);
    }

    unsetLimitIndicators(noodel);
}

export function unsetLimitIndicators(noodel: NoodelView) {
    forceReflow();
    noodel.showLimits.top = false;
    noodel.showLimits.bottom = false;
    noodel.showLimits.left = false;
    noodel.showLimits.right = false;
}

/**
 * Shifts the focal level by a level difference. If the difference is 0,
 * will align trunk to the current focal level.
 */
export function shiftFocalLevel(noodel: NoodelView, levelDiff: number) {

    clearTimeout(noodel.limitIndicatorTimeout);

    let prevFocalNoode = getActiveChild(noodel.focalParent);

    if (!prevFocalNoode) return;

    if (noodel.isInInspectMode) {
        exitInspectMode(noodel);
    }

    // if panning, cancel it
    if (noodel.panAxis === Axis.HORIZONTAL) {
        cancelPan(noodel);
    }

    let newFocalParent = findNewFocalParent(noodel, levelDiff);

    if (newFocalParent.id === noodel.focalParent.id) {
        // if unable to shift anymore in the target direction
        if (levelDiff < 0) {
            noodel.showLimits.left = true;
        }
        else if (levelDiff > 0) {
            noodel.showLimits.right = true;
        }
    }

    noodel.limitIndicatorTimeout = setTimeout(() => unsetLimitIndicators(noodel), 300);

    if (newFocalParent.id !== noodel.focalParent.id) {
        setFocalParent(noodel, newFocalParent);
    }
    
    alignTrunkToBranch(noodel, newFocalParent);
    forceReflow();

    handleFocalNoodeChange(noodel, prevFocalNoode, getActiveChild(noodel.focalParent));
}

/**
 * Shifts the active noode in the focal branch by an index difference. If the difference
 * is 0, will align the branch to the current active noode.
 */
export function shiftFocalNoode(noodel: NoodelView, indexDiff: number) {
    
    clearTimeout(noodel.limitIndicatorTimeout);

    let prevFocalNoode = getActiveChild(noodel.focalParent);

    if (!prevFocalNoode) return;

    if (noodel.isInInspectMode) {
        exitInspectMode(noodel);
    }

    // if panning, cancel it
    if (noodel.panAxis === Axis.VERTICAL) {
        cancelPan(noodel);
    }

    let targetIndex = noodel.focalParent.activeChildIndex + indexDiff;

    // clamp index to valid range
    if (targetIndex < 0) {
        targetIndex = 0;
    }
    else if (targetIndex >= noodel.focalParent.children.length) {
        targetIndex = noodel.focalParent.children.length - 1;
    }

    if (targetIndex === noodel.focalParent.activeChildIndex) {
        // if unable to shift anymore in the target direction
        if (indexDiff < 0) {
            noodel.showLimits.top = true;
        }
        else if (indexDiff > 0) {
            noodel.showLimits.bottom = true;
        }
    }

    noodel.limitIndicatorTimeout = setTimeout(() => unsetLimitIndicators(noodel), 300);

    if (targetIndex !== noodel.focalParent.activeChildIndex) {
        hideActiveSubtree(getActiveChild(noodel.focalParent));
        setActiveChild(noodel, noodel.focalParent, targetIndex);
        showActiveSubtree(noodel, noodel.focalParent, noodel.options.visibleSubtreeDepth, noodel.options.subtreeDebounceInterval);
    }
    
    alignBranchToIndex(noodel.focalParent, targetIndex);
    forceReflow();

    handleFocalNoodeChange(noodel, prevFocalNoode, getActiveChild(noodel.focalParent));
}

/**
 * Jumps to a specific noode in the tree, realigning all affected branches and trunk
 * if necessary. Should not expose to input handlers/API methods, use doJumpNavigation instead.
 */
export function alignNoodelOnJump(noodel: NoodelView, target: NoodeView) {

    // if panning, cancel it
    if (noodel.panAxis !== null) {
        cancelPan(noodel);
    }

    // No need to jump if target is already focal noode
    if (target.id === noodel.focalParent.children[noodel.focalParent.activeChildIndex].id) {
        return;
    }

    // finds the nearest visible branch
    let nearestVisibleBranchParent = target.parent;

    while (!nearestVisibleBranchParent.isChildrenVisible) {
        nearestVisibleBranchParent = nearestVisibleBranchParent.parent;
    }

    hideActiveSubtree(nearestVisibleBranchParent);

    // adjusts the active child of ancestors up to the nearest visible branch to point to target
    let nextParent = target.parent;
    let nextActiveChildIndex = target.index;

    while (true) {
        if (nextParent.activeChildIndex !== nextActiveChildIndex) {
            setActiveChild(noodel, nextParent, nextActiveChildIndex);
            alignBranchToIndex(nextParent, nextActiveChildIndex);
        }

        if (nextParent.id === nearestVisibleBranchParent.id) {
            break;
        }

        nextActiveChildIndex = nextParent.index;
        nextParent = nextParent.parent;
    }

    showActiveSubtree(noodel, nearestVisibleBranchParent, (target.level - 1 - nearestVisibleBranchParent.level) + noodel.options.visibleSubtreeDepth);

    if (target.parent.id !== noodel.focalParent.id) {
        setFocalParent(noodel, target.parent);
        alignTrunkToBranch(noodel, target.parent);
    }
    
    forceReflow();
}

/**
 * Jump navigation wrapper for use by input handlers/API methods, taking 
 * care of side effects.
 */
export function doJumpNavigation(noodel: NoodelView, target: NoodeView) {

    clearTimeout(noodel.limitIndicatorTimeout);

    let prevFocalNoode = getActiveChild(noodel.focalParent);

    if (!prevFocalNoode) return;

    if (noodel.isInInspectMode) {
        exitInspectMode(noodel);
    }

    alignNoodelOnJump(noodel, target);
    handleFocalNoodeChange(noodel, prevFocalNoode, getActiveChild(noodel.focalParent));
}

/**
 * Finds the new focal parent to move to when the a focal level change should occur
 * on the current active tree. If levelDiff goes beyond the existing
 * branches, will return the furthest branch possible, i.e. the root or the deepest branch.
 */
function findNewFocalParent(noodel: NoodelView, levelDiff: number): NoodeView {

    let nextParent = noodel.focalParent;

    if (levelDiff < 0) {
        for (let i = 0; i > levelDiff; i--) {
            if (nextParent.parent) {
                nextParent = nextParent.parent;
            }
            else {
                break;
            }
        }
    }
    else if (levelDiff > 0) {
        for (let i = 0; i < levelDiff; i++) {
            if (getActiveChild(nextParent).activeChildIndex !== null) {
                nextParent = getActiveChild(nextParent);
            }
            else {
                break;
            }
        }
    }

    return nextParent;
}

/**
 * Algorithm for computing how many noodes to snap across depending on swipe velocity.
 * Currently just a rough formula, can be further adjusted if necessary. 
 */
function computeSnapCount(velocity: number, snapMultiplier: number) {
    if (Math.abs(velocity) < 0.1) return 0;
    let count = Math.max(0, Math.round(Math.log(Math.abs(velocity) + Math.E)) * snapMultiplier);

    return (velocity > 0) ? -count : count;
}