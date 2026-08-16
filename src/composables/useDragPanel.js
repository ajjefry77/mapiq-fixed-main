import { ref, reactive, watch, nextTick } from 'vue';

export function useDragPanel(showPanel) {
  const panelReady = ref(false);
  const panelPositioned = ref(false);
  const isDragging = ref(false);
  const panelTranslate = reactive({ x: 0, y: 0 });
  const dragStart = reactive({ x: 0, y: 0 });

  const positionPanelBesideToolbar = (toolbarElement, panelElement) => {
    if (!panelElement || !toolbarElement) return;
    const toolbarRect = toolbarElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    const gap = 12;
    let x = toolbarRect.right + gap;
    let y = toolbarRect.top;
    if (x + panelRect.width > window.innerWidth - gap) {
      x = toolbarRect.left - panelRect.width - gap;
    }
    if (x < gap) {
      x = window.innerWidth - panelRect.width - gap;
    }
    if (y + panelRect.height > window.innerHeight - gap) {
      y = window.innerHeight - panelRect.height - gap;
    }
    if (y < gap) {
      y = gap;
    }
    panelTranslate.x = x;
    panelTranslate.y = y;
  };

  const startDrag = (e) => {
    isDragging.value = true;
    dragStart.x = e.clientX - panelTranslate.x;
    dragStart.y = e.clientY - panelTranslate.y;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  };

  const onDrag = (e) => {
    if (!isDragging.value) return;
    panelTranslate.x = e.clientX - dragStart.x;
    panelTranslate.y = e.clientY - dragStart.y;
  };

  const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  };

  watch(showPanel, async (newVal) => {
    if (newVal) {
      panelReady.value = false;
      panelPositioned.value = false;
      await nextTick();
      panelReady.value = true;
      await nextTick();
      panelPositioned.value = true;
    } else {
      panelReady.value = false;
      panelPositioned.value = false;
    }
  });

  return {
    panelReady,
    panelPositioned,
    panelTranslate,
    startDrag,
    positionPanelBesideToolbar,
  };
}
