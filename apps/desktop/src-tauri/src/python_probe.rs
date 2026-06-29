use serde::Serialize;
use crate::proc;

#[derive(Serialize, Clone)]
pub struct PythonEnv {
    #[serde(rename = "envId")]
    pub env_id: String,
    pub r#type: String,
    pub name: Option<String>,
    #[serde(rename = "pythonPathMasked")]
    pub python_path_masked: String,
    /// Actual python executable path — never serialized, stays in Rust only.
    #[serde(skip)]
    pub python_bin: String,
    #[serde(rename = "pythonVersion")]
    pub python_version: Option<String>,
    pub packages: serde_json::Value,
    pub status: String,
    pub missing: Vec<String>,
    pub recommended: bool,
}

const REQUIRED_PACKAGES: &[&str] = &[
    "scanpy", "anndata", "numpy", "pandas", "scipy",
    "sklearn", "matplotlib", "h5py", "igraph", "leidenalg",
    "umap", "pyarrow", "jinja2",
];

fn mask_path(path: &str) -> String {
    if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        if path.starts_with(&home) {
            return format!("~{}", &path[home.len()..]);
        }
    }
    let parts: Vec<&str> = path.split(['/', '\\']).collect();
    if parts.len() > 3 {
        format!(".../{}", parts[parts.len() - 3..].join("/"))
    } else {
        path.to_string()
    }
}

fn python_version(python_bin: &str) -> Option<String> {
    let out = proc::command(python_bin)
        .args(["--version"])
        .output()
        .ok()?;
    let raw = String::from_utf8_lossy(&out.stdout).to_string()
        + &String::from_utf8_lossy(&out.stderr);
    let version = raw.trim().replace("Python ", "");
    if version.is_empty() { None } else { Some(version) }
}

fn check_packages(python_bin: &str) -> (serde_json::Value, Vec<String>) {
    let script = format!(
        "import sys; import importlib.util; \
         pkgs={{}}; missing=[]; \
         names={:?}; \
         [( pkgs.update({{n:'installed'}}) if importlib.util.find_spec(n.replace('-','_')) else (missing.append(n), pkgs.update({{n:'missing'}})) ) for n in names]; \
         import json; print(json.dumps({{'pkgs':pkgs,'missing':missing}}))",
        REQUIRED_PACKAGES
    );
    let out = proc::command(python_bin)
        .args(["-c", &script])
        .output();
    match out {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
                let pkgs = v.get("pkgs").cloned().unwrap_or(serde_json::json!({}));
                let missing: Vec<String> = v.get("missing")
                    .and_then(|m| serde_json::from_value(m.clone()).ok())
                    .unwrap_or_default();
                return (pkgs, missing);
            }
            (serde_json::json!({}), REQUIRED_PACKAGES.iter().map(|s| s.to_string()).collect())
        }
        _ => (serde_json::json!({}), REQUIRED_PACKAGES.iter().map(|s| s.to_string()).collect()),
    }
}

fn make_env(env_id: String, env_type: &str, name: Option<String>, python_bin: &str) -> PythonEnv {
    let ver = python_version(python_bin);
    let (pkgs, missing) = check_packages(python_bin);

    let version_ok = ver.as_deref().map(|v| {
        let parts: Vec<u32> = v.split('.').take(2)
            .filter_map(|s| s.parse().ok()).collect();
        matches!(parts.as_slice(), [maj, min, ..] if *maj == 3 && *min >= 9)
    }).unwrap_or(false);

    let status = if !version_ok {
        "PYTHON_VERSION_UNSUPPORTED"
    } else if missing.is_empty() {
        "READY"
    } else {
        "MISSING_PACKAGES"
    }.to_string();

    let recommended = status == "READY";
    PythonEnv {
        env_id,
        r#type: env_type.to_string(),
        name,
        python_path_masked: mask_path(python_bin),
        python_bin: python_bin.to_string(),
        python_version: ver,
        packages: pkgs,
        status,
        missing,
        recommended,
    }
}

pub fn probe_envs() -> Vec<PythonEnv> {
    let mut envs = vec![];

    for cmd in &["python3", "python"] {
        if let Ok(out) = proc::command(cmd).args(["--version"]).output() {
            if out.status.success() || !String::from_utf8_lossy(&out.stderr).is_empty() {
                let bin = which_bin(cmd).unwrap_or_else(|| cmd.to_string());
                envs.push(make_env(format!("system:{}", cmd), "system", None, &bin));
                break;
            }
        }
    }

    if let Ok(out) = proc::command("conda").args(["env", "list", "--json"]).output() {
        if out.status.success() {
            if let Ok(j) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                if let Some(arr) = j.get("envs").and_then(|e| e.as_array()) {
                    for env_path in arr {
                        let p = env_path.as_str().unwrap_or("");
                        if p.is_empty() { continue; }
                        let name = p.split(['/', '\\']).last().map(|s| s.to_string());
                        #[cfg(windows)]
                        let bin = format!("{}\\python.exe", p);
                        #[cfg(not(windows))]
                        let bin = format!("{}/bin/python", p);
                        let env_id = format!("conda:{}", name.as_deref().unwrap_or(p));
                        envs.push(make_env(env_id, "conda", name, &bin));
                    }
                }
            }
        }
    }

    envs
}

fn which_bin(cmd: &str) -> Option<String> {
    #[cfg(windows)]
    let which_cmd = "where";
    #[cfg(not(windows))]
    let which_cmd = "which";
    let out = proc::command(which_cmd).arg(cmd).output().ok()?;
    if out.status.success() {
        let path = String::from_utf8_lossy(&out.stdout)
            .lines().next()?.trim().to_string();
        if !path.is_empty() { Some(path) } else { None }
    } else {
        None
    }
}

/// Look up the actual Python binary for a given envId.
/// This re-probes to ensure fresh paths without storing full paths in serializable state.
pub fn get_python_bin(env_id: &str) -> Option<String> {
    probe_envs()
        .into_iter()
        .find(|e| e.env_id == env_id)
        .map(|e| e.python_bin)
}
