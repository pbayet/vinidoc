import { useNavigate } from "react-router-dom";
import "../features/notFound/styles/NotFoundPage.scss";
import { MouseEvent, useCallback } from "react";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (window.history.length > 1) {
        navigate(-1);
        return;
      }

      navigate("/");
    },
    [navigate],
  );

  return (
    <main className="not-found">
      <section className="error-container">
        <span className="four">
          <span className="screen-reader-text">4</span>
        </span>
        <span className="zero">
          <span className="screen-reader-text">0</span>
        </span>
        <span className="four">
          <span className="screen-reader-text">4</span>
        </span>
      </section>

      <h1 className="not-found__title">Page non trouvée</h1>

      <CustomButton
        className="more-link"
        onClick={handleGoBack}
        leftIcon={<Icon iconName="arrow-left"></Icon>}
        variant="primary"
      >
        Retour
      </CustomButton>
    </main>
  );
};

export default NotFoundPage;
