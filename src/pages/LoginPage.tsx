import { APP_CODE } from "../app/config";
import { useCallback, useState } from "react";
import "../features/auth/styles/Login.scss";
import { apiRequest } from "../app/api/api";
import {
  CustomForm,
  CustomFormActions,
  CustomFormInput,
  CustomFormSubmit,
} from "@uvcdr/custom-form-system";
import { useAuth } from "@uvcdr/api-auth-system";

interface LoginValues {
  email: string;
  password: string;
}

const Login = () => {
  const { login } = useAuth();

  const [isLoading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (data: LoginValues) => {
      apiRequest<string>({
        endpoint: "auth",
        method: "POST",
        params: {
          email: data.email,
          password: data.password,
          appcode: APP_CODE,
        },
        setLoading,
        onSuccess(result) {
          login(result.data);
        },
      });
    },
    [login],
  );

  return (
    <>
      <div className="login-container">
        <div className="login-card">
          <h2 className="login-title">Connexion</h2>
          <CustomForm<LoginValues>
            initialValues={{
              email: "",
              password: "",
            }}
            className="login-form"
            inputSize="xs"
            onSubmit={onSubmit}
            loading={isLoading}
          >
            <CustomFormInput
              name="email"
              type="email"
              label="Email UVCDR"
              helpText={
                "Veuillez saisir votre email professionnel (@union-vignerons.com)"
              }
            ></CustomFormInput>
            <CustomFormInput
              name="password"
              type="password"
              label="Mot de passe"
              helpText={
                "Veuillez saisir le même mot de passe que vous utilisez pour vous connecter à votre PC"
              }
            ></CustomFormInput>

            <CustomFormActions align="right">
              <CustomFormSubmit>Connexion</CustomFormSubmit>
            </CustomFormActions>
          </CustomForm>
        </div>
      </div>
    </>
  );
};

export default Login;
