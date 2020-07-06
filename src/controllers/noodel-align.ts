import NoodeView from '@/types/NoodeView';
import NoodelView from '@/types/NoodelView';
import { traverseDescendents } from './noodel-traverse';
import { getFocalHeight, getFocalWidth } from '@/util/getters';
import { Axis } from '@/enums/Axis';
import Vue from 'vue';
import { forceReflow } from './noodel-animate';

/**
 * Aligns trunk and branches as necessary when a noode has been inserted.
 */
export function alignNoodelOnNoodeInsert(noodel: NoodelView, noode: NoodeView, newWidth: number, newHeight: number) {
        
    const parent = noode.parent;

    let heightDiff = newHeight - noode.size;
    let widthDiff = newWidth - parent.branchSize;

    noode.size = heightDiff;
    parent.branchSize = newWidth;

    if (Math.abs(heightDiff) > 0.01) {
        for (let i = noode.index + 1; i < parent.children.length; i++) {
            parent.children[i].branchRelativeOffset += heightDiff;
        }

        if (noode.index === parent.activeChildIndex) {
            parent.childBranchOffset -= heightDiff / 2;
            parent.childBranchOffsetAligned -= heightDiff / 2;
        }
        else if (noode.index < parent.activeChildIndex) {
            parent.childBranchOffset -= heightDiff;
            parent.childBranchOffsetAligned -= heightDiff;
        }
    }

    if (Math.abs(widthDiff) > 0.01) {
        traverseDescendents(parent, desc => desc.trunkRelativeOffset += widthDiff, false);

        if (parent.isFocalParent) {
            noodel.trunkOffset -= widthDiff / 2;
            noodel.trunkOffsetAligned -= widthDiff / 2;
        }
        else if (parent.isChildrenVisible && parent.level < noodel.focalLevel) {
            noodel.trunkOffset -= widthDiff;
            noodel.trunkOffsetAligned -= widthDiff;
        }
    }
}

/**
 * Aligns trunk and branches as necessary when a noode has resized.
 */
export function alignNoodelOnNoodeResize(noodel: NoodelView, noode: NoodeView, newWidth: number, newHeight: number) {

    const parent = noode.parent;

    let heightDiff = newHeight - noode.size;
    let widthDiff = newWidth - parent.branchSize;

    noode.size = newHeight;
    parent.branchSize = newWidth;

    if (Math.abs(heightDiff) > 0.01) {
        for (let i = noode.index + 1; i < parent.children.length; i++) {
            parent.children[i].branchRelativeOffset += heightDiff;
        }

        if (noode.index === parent.activeChildIndex) {
            parent.childBranchOffset -= heightDiff / 2;
            parent.childBranchOffsetAligned -= heightDiff / 2;
            //forceAlignBranch(noodel, parent, heightDiff / 2);

            if (noodel.panAxis === Axis.VERTICAL && parent.isFocalParent) {
                noodel.panOffsetOriginFocalBranch -= heightDiff / 2;
            }
        }
        else if (noode.index < parent.activeChildIndex) {
            parent.childBranchOffset -= heightDiff;
            parent.childBranchOffsetAligned -= heightDiff;
            //forceAlignBranch(noodel, parent, heightDiff);

            if (noodel.panAxis === Axis.VERTICAL && parent.isFocalParent) {
                noodel.panOffsetOriginFocalBranch -= heightDiff;
            }
        }
    }

    if (Math.abs(widthDiff) > 0.01) {

        traverseDescendents(parent, desc => desc.trunkRelativeOffset += widthDiff, false);

        if (parent.isFocalParent) {
            noodel.trunkOffset -= widthDiff / 2;
            noodel.trunkOffsetAligned -= widthDiff / 2;
            //forceAlignTrunk(noodel, widthDiff / 2);

            if (noodel.panAxis === Axis.HORIZONTAL) {
                noodel.panOffsetOriginTrunk -= widthDiff / 2;
            }
        }
        else if (parent.isChildrenVisible && parent.level < noodel.focalLevel) {
            noodel.trunkOffset -= widthDiff;
            noodel.trunkOffsetAligned -= widthDiff;
            //forceAlignTrunk(noodel, widthDiff);

            if (noodel.panAxis === Axis.HORIZONTAL) {
                noodel.panOffsetOriginTrunk -= widthDiff;
            }
        }
    }
}

/**
 * Aligns the branch as necessary BEFORE the deletion of a noode
 * and the mutation of its array of siblings.
 */
export function alignBranchBeforeNoodeDelete(noode: NoodeView) {

    let parent = noode.parent;

    // adjust sibling offsets
    for (let i = noode.index + 1; i < parent.children.length; i++) {
        parent.children[i].branchRelativeOffset -= noode.size;
    }

    if (noode.index === parent.activeChildIndex) {
        parent.childBranchOffset += noode.size / 2;
        parent.childBranchOffsetAligned += noode.size / 2;
    }
    else if (noode.index < parent.activeChildIndex) {
        parent.childBranchOffset += noode.size;
        parent.childBranchOffsetAligned += noode.size;
    }
}

/**
 * Aligns the trunk to center on the given branch.
 */
export function alignTrunkToBranch(noodel: NoodelView, branchParent: NoodeView) {

    let targetOffset = (-branchParent.trunkRelativeOffset) - (branchParent.branchSize / 2);

    // only apply transition effect if there's actual movement
    if (Math.abs(noodel.trunkOffset - targetOffset) >= 1) { 
        noodel.applyTrunkMove = true;
    }

    noodel.trunkOffset = targetOffset;
    noodel.trunkOffsetAligned = targetOffset;
}

/**
 * Aligns a branch to center on the noode at the given index.
 */
export function alignBranchToIndex(parent: NoodeView, index: number) {

    let targetOffset = (-parent.children[index].branchRelativeOffset) - (parent.children[index].size / 2);

    // only apply transition effect if there's actual movement
    if (Math.abs(parent.childBranchOffset - targetOffset) >= 1) { 
        parent.applyBranchMove = true;
    }

    parent.childBranchOffset = targetOffset;
    parent.childBranchOffsetAligned = targetOffset;
}

// /**
//  * Force a branch to shift its position by a difference, regardless whether it is in transition.
//  * Removes this force positioning at the next frame, unless panning.
//  */
// export function forceAlignBranch(noodel: NoodelView, parent: NoodeView, diff: number) {

//     let currentBranchOffset = parent.childBranchOffsetForced === null ? 
//         parent.childBranchEl.getBoundingClientRect().top - noodel.canvasEl.getBoundingClientRect().top - getFocalHeight(noodel) :
//         parent.childBranchOffsetForced;

//     parent.childBranchOffsetForced = currentBranchOffset - diff;

//     if (noodel.panAxis !== Axis.VERTICAL) {
//         Vue.nextTick(() => {
//             forceReflow();
//             parent.childBranchOffsetForced = null;
//         });
//     }
// }

// /**
//  * Force the trunk to shift its position by a difference, regardless whether it is in transition.
//  * Removes this force positioning at the next frame, unless panning.
//  */
// export function forceAlignTrunk(noodel: NoodelView, diff: number) {

//     let currentTrunkOffset = noodel.trunkEl.getBoundingClientRect().left - noodel.canvasEl.getBoundingClientRect().left - getFocalWidth(noodel);

//     noodel.trunkOffsetForced = currentTrunkOffset - diff;

//     if (noodel.panAxis !== Axis.HORIZONTAL) {
//         Vue.nextTick(() => {
//             forceReflow();
//             noodel.trunkOffsetForced = null;
//         });
//     }     
// }