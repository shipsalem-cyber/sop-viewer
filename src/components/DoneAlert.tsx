type Props = { message: string; onDismiss(): void };

export function DoneAlert({ message, onDismiss }: Props) {
  return (
    <div role="alert" className="done-alert">
      <span className="done-icon" aria-hidden="true">⏰</span>
      <span className="done-text">{message}</span>
      <button className="btn btn-primary" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
