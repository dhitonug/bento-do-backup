import { db } from "../../config/db.js";
import * as taskRepo from "../tasks/tasks.repository.js";

const HARD_CODED_TEMPLATES = {
  makalah: {
    key: "makalah",
    name: "Makalah",
    description: "Template cepat untuk tugas makalah mahasiswa.",
    items: [
      {
        title: "Tentukan topik makalah",
        energy_weight: "Ringan",
      },
      {
        title: "Cari referensi & susun outline makalah",
        energy_weight: "Sedang",
      },
      {
        title: "Tulis dan revisi makalah",
        energy_weight: "Berat",
      },
    ],
  },

  presentasi: {
    key: "presentasi",
    name: "Presentasi",
    description: "Template cepat untuk persiapan presentasi kelas.",
    items: [
      {
        title: "Tentukan poin utama presentasi",
        energy_weight: "Ringan",
      },
      {
        title: "Buat slide presentasi",
        energy_weight: "Sedang",
      },
      {
        title: "Latihan presentasi",
        energy_weight: "Sedang",
      },
    ],
  },

  praktikum: {
    key: "praktikum",
    name: "Praktikum",
    description: "Template cepat untuk tugas atau laporan praktikum.",
    items: [
      {
        title: "Pahami modul praktikum",
        energy_weight: "Ringan",
      },
      {
        title: "Kerjakan praktikum / eksperimen",
        energy_weight: "Berat",
      },
      {
        title: "Susun laporan praktikum",
        energy_weight: "Sedang",
      },
    ],
  },

  ujian: {
    key: "ujian",
    name: "Ujian",
    description: "Template cepat untuk persiapan ujian.",
    items: [
      {
        title: "Kumpulkan materi ujian",
        energy_weight: "Ringan",
      },
      {
        title: "Buat ringkasan & latihan soal",
        energy_weight: "Sedang",
      },
      {
        title: "Review materi inti ujian",
        energy_weight: "Berat",
      },
    ],
  },
};

export const listTemplates = async () => {
  return Object.values(HARD_CODED_TEMPLATES).map((template) => ({
    key: template.key,
    name: template.name,
    description: template.description,
    total_items: template.items.length,
    preview_items: template.items,
  }));
};

export const findTemplateByKey = async (templateKey) => {
  return HARD_CODED_TEMPLATES[templateKey] || null;
};

export const applyTemplate = async (identifier, template, sourceTemplate = null) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const createdTasks = [];

    for (const item of template.items) {
      const createdTask = await taskRepo.createTask(
        {
          user_id: identifier.user_id ?? null,
          guest_session_id: identifier.guest_session_id ?? null,
          title: item.title,
          energy_weight: item.energy_weight,
          deadline: null,
          source_template: sourceTemplate ?? template.name,
        },
        client,
      );

      createdTasks.push(createdTask);
    }

    await client.query("COMMIT");

    return createdTasks;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};