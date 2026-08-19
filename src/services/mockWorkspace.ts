export interface MockFileStructure {
  [path: string]: string;
}

export const INITIAL_MOCK_FILES: MockFileStructure = {
  '/workspace/src/main.wv': `// Weave Main Entry Point
// Advanced concurrency samples: strand TaskWorker, loom AppLoom

component WeaveWorkspace {
    store build_count = 12;

    ui {
        VStack(gap: 20, padding: 28) {
            Text("Build beautiful things with Weave");
            Text("A reactive workspace powered by the Loom runtime.");

            HStack(gap: 10) {
                Button("Run project", onClick: fn() {
                    build_count += 1;
                });
                Button("Reset", onClick: fn() {
                    build_count = 0;
                });
            }

            HStack(gap: 12) {
                Text("Loom online");
                Text("Builds: " + build_count);
            }
        }
    }
}
`,

  '/workspace/src/concurrency.wv': `// Weave Concurrency & Strand Pipeline Demo
import std::loom::{Strand, Channel, spawn};
import std::sync::atomic::AtomicU64;

@derive(Clone)
struct PipelineEvent {
    pub timestamp: u64,
    pub metric: f64,
}

strand SensorProducer {
    out_chan: Channel<PipelineEvent>,

    pub async fn produce(self) {
        for tick in 0..10 {
            let event = PipelineEvent {
                timestamp: tick,
                metric: (tick as f64) * 3.14159,
            };
            self.out_chan.send(event).await;
        }
    }
}

strand FilterStrand {
    in_chan: Channel<PipelineEvent>,
    out_chan: Channel<f64>,

    pub async fn filter(self) {
        while let Some(evt) = self.in_chan.recv().await {
            if evt.metric > 10.0 {
                self.out_chan.send(evt.metric).await;
            }
        }
    }
}

fn main() {
    let (tx1, rx1) = Channel::unbounded();
    let (tx2, rx2) = Channel::unbounded();

    let producer = SensorProducer { out_chan: tx1 };
    let filter = FilterStrand { in_chan: rx1, out_chan: tx2 };

    spawn(producer.produce());
    spawn(filter.filter());
}
`,

  '/workspace/src/geometry.wv': `// Geometric vector math in Weave
struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Vec3 { x, y, z }
    }

    pub fn length(&self) -> f64 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    pub fn dot(&self, other: &Vec3) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: &Vec3) -> Vec3 {
        Vec3 {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }
}

@test
fn test_vec3_cross_product() {
    let v1 = Vec3::new(1.0, 0.0, 0.0);
    let v2 = Vec3::new(0.0, 1.0, 0.0);
    let v3 = v1.cross(&v2);
    assert_eq!(v3.z, 1.0);
}
`,

  '/workspace/examples/counter.wv': `component Counter {
    store count = 0;

    ui {
        VStack(gap: 12, padding: 16) {
            Text("Count: " + count);
            HStack(gap: 8) {
                Button("Increment", onClick: fn() {
                    count += 1;
                });
                Button("Decrement", onClick: fn() {
                    count -= 1;
                });
                Button("Reset", onClick: fn() {
                    count = 0;
                });
            }
        }
    }
}
`,

  '/workspace/examples/todo_app.wv': `// Reactive Todo App Example in Weave
store TodoStore {
    items: List<String> = [],
    input_text: String = "",
}

component TodoApp {
    use TodoStore;

    fn add_item() {
        if TodoStore.input_text != "" {
            TodoStore.items.push(TodoStore.input_text);
            TodoStore.input_text = "";
        }
    }

    ui {
        div(class: "todo-container") {
            h2 { "Weave Task Manager" }
            input(bind: TodoStore.input_text, placeholder: "New task...")
            button(onclick: fn() { add_item(); }) { "Add Task" }
        }
    }
}
`,

  '/workspace/examples/dashboard.wv': `// Analytics Dashboard Component
component AnalyticsDashboard {
    var active_tab: String = "overview";
    var memory_usage_mb: Int = 142;

    ui {
        div(class: "dashboard-layout") {
            h1 { "Weave Engine Telemetry" }
            span { "Active Loom Strands: 4" }
        }
    }
}
`,

  '/workspace/weave.toml': `[project]
name = "demo-weave-app"
version = "0.1.0"
authors = ["Weave Developer <dev@weave.org>"]
edition = "2026"

[dependencies]
std = { version = "2.4.0", features = ["loom", "async", "io"] }
math = "1.2.0"

[loom]
worker_threads = 8
scheduler = "work-stealing"
tracing = true
`,

  '/workspace/README.md': `# Weave Application Project

Welcome to your **Weave IDE** workspace!

## Getting Started
- Open \`src/main.wv\` to inspect the main entry point and Loom orchestration.
- Use the **Integrated Terminal** at the bottom to build and run:
  - \`weave run src/main.wv\`
  - \`weave check\`
  - \`weave test\`
- Adjust editor and compiler preferences in the **Workspace Settings** panel.
`,
};
