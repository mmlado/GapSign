import ReactTestRenderer from 'react-test-renderer';

export function getActivePressables(
  renderer: ReactTestRenderer.ReactTestRenderer,
) {
  return renderer.root.findAll(
    (node: any) =>
      typeof node.props.onPress === 'function' && !node.props.disabled,
    { deep: true },
  );
}

/**
 * Find a pressable key by its visible label. Locates the Text node whose
 * children exactly match `label`, then walks up the tree to the nearest
 * ancestor that has an onPress handler.
 */
export function findKey(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const textNode = renderer.root.find(
    (node: any) => node.type === 'Text' && node.props.children === label,
  );
  let node = textNode.parent;
  while (node) {
    if (typeof node.props?.onPress === 'function') {
      return node;
    }
    node = node.parent;
  }
  throw new Error(`No pressable found for key "${label}"`);
}
