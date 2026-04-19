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
    <div className="page-header">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <button onClick={() => navigate(-1)} className="btn btn-icon btn-ghost -ml-2" aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="page-header-title truncate">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
