import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { PASSWORD_RULES, STRENGTH_META, evaluatePassword } from "@/lib/passwordStrength";
import { useI18n } from "@/lib/i18n";

export function PasswordStrength({
  password,
  translate,
}: {
  password: string;
  translate?: (key: string) => string;
}) {
  const { t: appT } = useI18n();
  const t = translate ?? appT;
  const { level, passed } = evaluatePassword(password);
  const meta = STRENGTH_META[level];

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
          <motion.div
            className={`h-full rounded-full ${meta.bg}`}
            initial={false}
            animate={{ width: `${meta.widthPct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <span className={`text-[11px] font-medium ${meta.color}`}>
          {t("password.strength")}:{meta.label === "—" ? meta.label : t(meta.label)}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = passed.includes(rule.key);
          return (
            <li
              key={rule.key}
              className={`flex items-center gap-1.5 transition-colors ${
                ok ? "text-emerald-400" : "text-muted-foreground"
              }`}
            >
              <span
                className={`grid h-3.5 w-3.5 place-items-center rounded-full ${
                  ok ? "bg-emerald-500/20" : "bg-white/5"
                }`}
              >
                {ok ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
              </span>
              {t(rule.labelKey)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
