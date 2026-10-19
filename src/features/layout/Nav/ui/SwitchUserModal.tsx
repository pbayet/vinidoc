import React, { useCallback, useEffect, useState } from "react";
import { Modal } from "@uvcdr/modal";
import { Permission, User } from "../../../../entities/auth";
import { apiRequestAll, typed } from "../../../../app/api/api";
import { clearCache } from "../../../../shared/lib/utils/cache.functions";
import {
  CustomForm,
  CustomFormSelect,
  CustomFormGrid,
  validators,
  mapToSelectOptions,
  SelectOption,
  CustomFormActions,
  CustomFormSubmit,
  CustomFormButton,
  Icon,
} from "@uvcdr/custom-form-system";
import { useAuth } from "@uvcdr/api-auth-system";
import { useNotification } from "@uvcdr/confirm-notify-system";
import { useSwitchUser } from "../hooks/useSwitchUser";

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormDataProps {
  email: string;
  permissionLevel: string;
}

/**
 * Formulaire de changement d'utilisateur (admin uniquement), auparavant
 * affiché directement dans la barre du Header. Extrait ici pour être ouvert
 * depuis le bouton "Changer d'utilisateur" du pied de la Nav. La logique
 * d'appel (`auth/dev`) est mutualisée avec le bouton "Revenir à mon compte"
 * de la Nav via `useSwitchUser`.
 */
const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { jwtPayload } = useAuth();
  const { notify } = useNotification();
  const { isLoading, switchUser, resetToBaseUser } = useSwitchUser();

  const [isLoadingOptions, setLoadingOptions] = useState(false);
  const [usersOptions, setUsersOptions] = useState<SelectOption[]>([]);
  const [permissionsOptions, setPermissionsOptions] = useState<SelectOption[]>(
    [],
  );

  /* ---------------------------------------------------------------------- */
  /*  Chargement utilisateurs & permissions                                    */
  /* ---------------------------------------------------------------------- */

  const setDatas = useCallback(
    (usersData: User[], permissionsData: Permission[]) => {
      setUsersOptions(
        mapToSelectOptions(User.parseToClasses(usersData), {
          value: "EMAIL",
          label: (u) => u.getFullNameReverse(),
        }),
      );
      setPermissionsOptions(
        mapToSelectOptions(Permission.parseToClasses(permissionsData), {
          value: "PRMLVL",
          label: "PRMNAM",
        }),
      );
    },
    [],
  );

  // Chargé à l'ouverture de la modale plutôt qu'au montage de la Nav : évite
  // un appel réseau superflu tant que l'admin n'a jamais ouvert le modal.
  useEffect(() => {
    if (!isOpen) return;

    apiRequestAll({
      requests: [
        typed<User[]>({
          endpoint: "usersmanager",
          method: "GET",
          token: jwtPayload.$token,
          silentError: true,
        }),
        typed<Permission[]>({
          endpoint: "usersmanager/permissions",
          method: "GET",
          token: jwtPayload.$token,
          silentError: true,
        }),
      ] as const,
      setLoading: setLoadingOptions,
      onSuccess: ([resUsers, resPerms]) => {
        const usersData = User.parseToClasses(resUsers.data) || [];
        const permsData = Permission.parseToClasses(resPerms.data) || [];
        permsData.push(new Permission(0, "Default", "", 0));

        setDatas(
          usersData.filter((u) => u.USRACTV),
          permsData,
        );
      },
    });
  }, [isOpen, jwtPayload.$token, setDatas]);

  /* ---------------------------------------------------------------------- */
  /*  Switch utilisateur                                                       */
  /* ---------------------------------------------------------------------- */

  const onSubmit = useCallback(
    (data: FormDataProps) => {
      switchUser(data.email, data.permissionLevel);
    },
    [switchUser],
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Changer d'utilisateur"
      onClose={onClose}
      size="sm"
      lockBodyScroll={false}
    >
      <CustomForm<FormDataProps>
        initialValues={{
          email: jwtPayload.$userEmail,
          permissionLevel: String(jwtPayload.$permissionLevel),
        }}
        onSubmit={onSubmit}
        validateOnBlur={false}
        validateOnChange={false}
        inputSize="xs"
        loading={isLoading || isLoadingOptions}
      >
        <CustomFormGrid columns={1} gap={12}>
          {usersOptions.length > 0 && permissionsOptions.length > 0 && (
            <>
              <CustomFormSelect
                name="email"
                label="Utilisateur"
                options={usersOptions}
                placeholder="Sélectionnez un utilisateur..."
                validate={validators.required("L'utilisateur est obligatoire")}
              />
              <CustomFormSelect
                name="permissionLevel"
                label="Permission"
                options={permissionsOptions}
                placeholder="Sélectionnez une permission..."
                validate={validators.required("La permission est obligatoire")}
              />
              <CustomFormActions align="space-between">
                <CustomFormButton
                  variant="danger"
                  onClick={() => {
                    clearCache();
                    notify("Le cache à bien été vidé.");
                  }}
                  leftIcon={<Icon iconName="broom" />}
                  size="xs"
                  title="Effacer le cache"
                >
                  {/* Effacer le cache */}
                </CustomFormButton>
                <CustomFormButton
                  variant="secondary"
                  onClick={resetToBaseUser}
                  leftIcon={<Icon iconName="rotate-right" />}
                  size="xs"
                  title="Utilisateur de base"
                >
                  {/* Utilisateur de base */}
                </CustomFormButton>
                <CustomFormSubmit
                  leftIcon={<Icon iconName="right-to-bracket" />}
                  variant="success"
                  size="xs"
                  title="Changer d'utilisateur"
                >
                  {/* Changer d'utilisateur */}
                </CustomFormSubmit>
              </CustomFormActions>
            </>
          )}
        </CustomFormGrid>
      </CustomForm>
    </Modal>
  );
};

export default SwitchUserModal;
