import { FileText, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { PDFMetadata } from '~/stores/library-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';

interface PDFCardProps {
  pdf: PDFMetadata;
  onDelete: (id: string) => void;
}

export function PDFCard({ pdf, onDelete }: PDFCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${pdf.title}"?`)) {
      onDelete(pdf.id);
    }
  };

  return (
    <Link to={`/perform/${pdf.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <FileText className="h-8 w-8 text-primary mb-2" />
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardAction>
          </div>
          <CardTitle className="line-clamp-2">{pdf.title}</CardTitle>
          <CardDescription>
            {pdf.pageCount} {pdf.pageCount === 1 ? 'page' : 'pages'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Added {new Date(pdf.addedAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
