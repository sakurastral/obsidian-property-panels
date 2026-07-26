export interface PanelHeaderState {
  title: string;
  visible: boolean;
}

export function panelHeaderState(name: string, collapsible: boolean): PanelHeaderState {
  const title = name.trim();
  return {
    title,
    visible: title !== "" || collapsible
  };
}
