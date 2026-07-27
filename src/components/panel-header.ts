export interface PanelHeaderState {
  title: string;
  visible: boolean;
}

export function panelHeaderState(name: string, collapsible: boolean, showTitle: boolean): PanelHeaderState {
  const title = showTitle ? name.trim() : "";
  return {
    title,
    visible: title !== "" || collapsible
  };
}
