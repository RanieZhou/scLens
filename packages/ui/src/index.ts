export type EmptyStateProps = {
  title: string;
  description?: string;
};

export function createEmptyStateText(props: EmptyStateProps): string {
  return props.description === undefined ? props.title : `${props.title}: ${props.description}`;
}
