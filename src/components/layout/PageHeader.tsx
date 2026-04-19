import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, back, action }: PageHeaderProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-4 md:px-0">
      <div className="flex items-center gap-3">
        {back && (
          <button onClick={() => navigate(-1)} className="btn btn-icon btn-ghost -ml-2" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold font-heading">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
};
