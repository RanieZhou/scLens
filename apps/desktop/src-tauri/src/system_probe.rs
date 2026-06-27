use serde::Serialize;
use sysinfo::System;

#[derive(Serialize, Clone)]
pub struct CpuInfo {
    pub model: String,
    #[serde(rename = "physicalCores")]
    pub physical_cores: usize,
    #[serde(rename = "logicalCores")]
    pub logical_cores: usize,
}

#[derive(Serialize, Clone)]
pub struct MemoryInfo {
    #[serde(rename = "totalGb")]
    pub total_gb: f64,
    #[serde(rename = "availableGb")]
    pub available_gb: f64,
}

#[derive(Serialize, Clone)]
pub struct DiskInfo {
    #[serde(rename = "freeGb")]
    pub free_gb: f64,
}

#[derive(Serialize, Clone)]
pub struct GpuInfo {
    pub vendor: String,
    pub name: String,
}

#[derive(Serialize, Clone)]
pub struct SystemInfo {
    pub hostname: String,
    pub os: String,
    pub arch: String,
    #[serde(rename = "cpuInfo")]
    pub cpu_info: CpuInfo,
    #[serde(rename = "memoryInfo")]
    pub memory_info: MemoryInfo,
    #[serde(rename = "diskInfo")]
    pub disk_info: DiskInfo,
    #[serde(rename = "gpuInfo")]
    pub gpu_info: Vec<GpuInfo>,
}

pub fn probe() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
    let os = format!(
        "{} {}",
        System::name().unwrap_or_default(),
        System::os_version().unwrap_or_default()
    );
    let arch = std::env::consts::ARCH.to_string();

    let cpu_model = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let logical_cores = sys.cpus().len();
    let physical_cores = System::physical_core_count().unwrap_or(logical_cores / 2).max(1);

    let total_gb = sys.total_memory() as f64 / 1_073_741_824.0;
    let available_gb = sys.available_memory() as f64 / 1_073_741_824.0;

    // Disk: use sysinfo Disks
    use sysinfo::Disks;
    let disks = Disks::new_with_refreshed_list();
    let free_bytes: u64 = disks.iter().map(|d| d.available_space()).sum();
    let free_gb = free_bytes as f64 / 1_073_741_824.0;

    SystemInfo {
        hostname,
        os,
        arch,
        cpu_info: CpuInfo {
            model: cpu_model,
            physical_cores,
            logical_cores,
        },
        memory_info: MemoryInfo { total_gb, available_gb },
        disk_info: DiskInfo { free_gb },
        gpu_info: vec![],
    }
}
