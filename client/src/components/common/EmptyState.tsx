import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <Package className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-muted-foreground max-w-sm mb-6">{description}</p>}
      {action && (
        action.href ? (
          <Button asChild><Link to={action.href}>{action.label}</Link></Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}
