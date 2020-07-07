<!--------------------------- TEMPLATE ----------------------------->

<template>

    <transition name="nd-branch">
        <div 
            v-show="parent.isChildrenVisible || parent.isChildrenTransparent"
            class="nd-branch" 
            ref="branch"
            :class="branchClass"
            :style="branchStyle"
            @transitionend="onTransitionEnd"
        >  
            <transition-group name="nd-noode">
                <NoodelCanvasTrunkBranchNoode
                    v-for="child in parent.children"
                    :key="child.id"
                    :noode="child" 
                    :store="store"
                />
            </transition-group>
        </div>
    </transition>
    
</template>

<!---------------------------- SCRIPT ------------------------------>

<script lang="ts">

    import { ResizeSensor } from 'css-element-queries';

    import NoodelCanvasTrunkBranchNoode from '@/view/NoodelCanvasTrunkBranchNoode.vue';

    import { getFocalHeight } from '@/util/getters';
    import NoodeView from '@/types/NoodeView';
    import NoodelView from '@/types/NoodelView';
    import { Axis } from '@/enums/Axis';
    import Vue, { PropType } from 'vue';
    import { alignTrunkOnBranchResize } from '../controllers/noodel-align';

    export default Vue.extend({
        
        components: {
            NoodelCanvasTrunkBranchNoode,
        },

        props: {
            parent: Object as PropType<NoodeView>,
            store: Object as PropType<NoodelView>
        },

        mounted() {
            if (this.parent.isFocalParent) {
                this.store.focalBranchEl = this.$refs.branch as Element;
            }

            this.parent.childBranchEl = this.$refs.branch as Element;

            let rect = (this.$refs.branch as Element).getBoundingClientRect();

            alignTrunkOnBranchResize(this.store, this.parent, rect.width, true);

            this.parent.branchResizeSensor = new ResizeSensor(this.$refs.branch as Element, () => {
                this.updateRenderedSize();
            });
        },

        beforeDestroy() {
            if (this.parent.branchResizeSensor) this.parent.branchResizeSensor.detach();
        },

        computed: {

            branchStyle(): {} {
                return {
                    left: `${this.parent.trunkRelativeOffset}px`,
                    transform: `translateY(${this.parent.childBranchOffset + getFocalHeight(this.store)}px)`
                };
            },

            branchClass(): {} {
                return {
                    'nd-branch-move': this.parent.applyBranchMove,
                    'nd-branch-hidden': !this.parent.isChildrenVisible && this.parent.isChildrenTransparent,
                    'nd-branch-focal': this.parent.isFocalParent
                }
            }
        },

        watch: {
            "parent.isFocalParent": function (newVal: boolean, oldVal: boolean) {
                if (newVal === true) {
                    this.store.focalBranchEl = this.$refs.branch as Element;
                }
            }
        },

        methods: {

            updateRenderedSize() {
                let rect = (this.$refs.branch as Element).getBoundingClientRect();

                alignTrunkOnBranchResize(this.store, this.parent, rect.width);
            },

            onTransitionEnd(ev: TransitionEvent) {
                if (ev.propertyName === "transform") {
                    ev.stopPropagation();
                    this.parent.applyBranchMove = false;
                }
            }
        }
        
    });
    
</script>

<!---------------------------- STYLES ------------------------------>

<style>

    .nd-branch {
        position: absolute;
        display: flex;
        flex-direction: column; 
    }

    .nd-branch-enter, .nd-branch-leave-active {
        opacity: 0;
    }

    .nd-branch-enter-active, .nd-branch-leave-active {
        transition-property: opacity;
        transition-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000); /* easeOutCubic from Penner equations */
        transition-duration: .5s; 
    }

    .nd-branch-move {
        transition-property: opacity, transform;
        transition-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000); /* easeOutCubic from Penner equations */
        transition-duration: .5s; 
    }

    .nd-branch-hidden {
        opacity: 0;
        pointer-events: none;
    }

    .noodes-enter, .noodes-leave-to {
        opacity: 0;
    }

    .noodes-leave-active {
        position: absolute;
        width: 100%;
    }        

</style>